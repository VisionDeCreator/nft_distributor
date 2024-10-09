// Packages imports
import { writeFileSync } from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { Transaction } from "@mysten/sui/transactions";
import _ from 'lodash';
import { client, admin_keypair, find_one_by_type } from './helpers.js';
import data from "./data/metadata.json";
import deployedObjects from "../deployed_objects.json";

const path_to_scripts = dirname(fileURLToPath(import.meta.url));


console.log("Distributing NFTs");

const keypair = admin_keypair();

let txResponse = {
  digest: ''
};

let revealObject = [];

const metaDataChuncks = _.chunk(data, 250);

for (let i = 0; i < metaDataChuncks.length; i++) {


  if(txResponse?.digest as string != '') {
    await client.waitForTransaction({
      digest: txResponse.digest,
      options: { showObjectChanges: true }
    });
  }

  console.log(`Distributing NFT batch #${i + 1}`);
  const nftData = data[i];    

  const tx = new Transaction();

  let numberArray: any = [];
  let keyArray: any = [];
  let valuesArray: any = [];
  let imageArray: any = [];

      // Here we loop over an individual subarray in order to create a transaction
      for (let j = 0; j < metaDataChuncks[i].length; j++) {
        const nftData = metaDataChuncks[i][j];
  
  
        const dataKeys: any[] = Object.keys(nftData.attributes);
        const dataValues: any[] = Object.values(nftData.attributes);
  
        let pureKeys = dataKeys.map(key => tx.pure.string(key));
        let pureValues = dataValues.map(value => tx.pure.string(value));
  
        const keys = tx.makeMoveVec({
          type: `0x1::string::String`,
          elements: pureKeys
        });
  
        const values = tx.makeMoveVec({
          type: `0x1::string::String`,
          elements: pureValues
        });
  
        imageArray.push(tx.pure.string(nftData.image_url));
        numberArray.push(tx.pure.u64(nftData.number));
        keyArray.push(keys);
        valuesArray.push(values);
  
      }
  
      const vetorKeys = tx.makeMoveVec({
        type: `vector<0x1::string::String>`,
        elements: keyArray
      });
  
      const vetorValues = tx.makeMoveVec({
        type: `vector<0x1::string::String>`,
        elements: valuesArray
      });
  
      const vectorNumbers = tx.makeMoveVec({
        type: `u64`,
        elements: numberArray
      });
      
      const vectorImages = tx.makeMoveVec({
        type: `0x1::string::String`,
        elements: imageArray
      });


  let dataObject: {objectId: string | null, number: number | null, digest: string | null} = {number:null, digest: null, objectId: null};

  tx.setGasBudget(1000000000);

  tx.moveCall({
    target: `${deployedObjects.packageId}::distributor::mint`,
    arguments: [
      tx.object(deployedObjects.distributor.distributorCap),
      tx.object(deployedObjects.distributor.distributor),
      tx.object(deployedObjects.distributor.policy),
      vectorNumbers,
      vectorImages,
      vetorKeys,
      vetorValues,
      tx.pure.address(nftData.address),
    ]
  });

  const response = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: {
      showBalanceChanges: true,
      showEffects: true,
      showEvents: true,
      showInput: false,
      showObjectChanges: true,
      showRawInput: false
  }
  });
  

  const rinoco = `${deployedObjects.packageId}::rinoco::Rinoco`;

  // Ensure objectChanges is defined and an array before using it
if (response.objectChanges && Array.isArray(response.objectChanges)) {
  const rinoco_id = find_one_by_type(response.objectChanges, rinoco);

  if (!rinoco_id) {
    console.log("Error: Could not find rinoco object");
    process.exit(1);
  }

  dataObject.objectId = rinoco_id;
} else {
  console.log("Error: objectChanges is undefined or not an array");
  process.exit(1);
}

  dataObject.number = i + 1;
  dataObject.digest = response?.digest;

  revealObject.push(dataObject);

  txResponse = response;

  console.log(`NFT #${i + 1} has been revealed`);
}

writeFileSync(path.join(path_to_scripts, "../distributed_objects.json"), JSON.stringify(revealObject, null, 4))

console.log("NFT reveal complete.");