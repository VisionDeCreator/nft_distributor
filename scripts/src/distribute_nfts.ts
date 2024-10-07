// Packages imports
import { writeFileSync } from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { Transaction } from "@mysten/sui/transactions";
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

for (let i = 0; i < data.metadata.length; i++) {

  if(txResponse?.digest as string != '') {
    await client.waitForTransaction({
      digest: txResponse.digest,
      options: { showObjectChanges: true }
    });
  }

  console.log(`Distributing NFT #${i + 1}`);
  const nftData = data.metadata[i];    

  const tx = new Transaction();

  const dataKeys = Object.keys(nftData.attributes);
  const dataValues: any[] = Object.values(nftData.attributes);

  let pureKeys = dataKeys.map(key => tx.pure.string(key));
  let pureValues = dataValues.map(value => tx.pure.string(value));

  let dataObject: {objectId: string | null, number: number | null, digest: string | null} = {number:null, digest: null, objectId: null};

  tx.setGasBudget(1000000000);

  const keys = tx.makeMoveVec({
    type: `0x1::string::String`,
    elements: pureKeys
  });

  const values = tx.makeMoveVec({
    type: `0x1::string::String`,
    elements: pureValues
  });

  tx.moveCall({
    target: `${deployedObjects.packageId}::distributor::mint`,
    arguments: [
      tx.object(deployedObjects.distributor.distributorCap),
      tx.object(deployedObjects.distributor.distributor),
      tx.object(deployedObjects.distributor.policy),
      tx.pure.u64(nftData.number),
      tx.pure.string(nftData.image_url),
      keys,
      values,
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