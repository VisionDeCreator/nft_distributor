// Packages imports
import { writeFileSync } from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { Transaction } from "@mysten/sui/transactions";
import { client, admin_keypair } from './helpers.js';
import data from "./data/metadata.json";

const path_to_scripts = dirname(fileURLToPath(import.meta.url));


console.log("Distributing NFTs");

const keypair = admin_keypair();
const packageId = "0xb3a99bd9823d82762821df8609f2461385d20836a6b385d4de19ee45e883942d";


let revealObject = [];

for (let i = 0; i < data.metadata.length; i++) {
  console.log(`Distributing NFT #${i + 1}`);
  const nftData = data.metadata[i];    

  const tx = new Transaction();

  const dataKeys = Object.keys(nftData.attributes);
  const dataValues: any[] = Object.values(nftData.attributes);

  let pureKeys = dataKeys.map(key => tx.pure.string(key));
  let pureValues = dataValues.map(value => tx.pure.string(value));

  let dataObject: {number: number | null, digest: string | null} = {number:null, digest: null};

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
    target: `${packageId}::distributor::send_nft`,
    arguments: [
      tx.object("0xb6fbd543b042e1b87204b87afaa7fc4e402042bda59bd07659a4e04bb2b2bfe4"),
      tx.object("0xd341b2190c5ddf9f5ff2702a8e24d7311e95da75339c1342a762cfab176aabc4"),
      tx.object("0xb8b4c712cf9f76476f6b5af89c779b508cba18b3dfd9abc25a9a9dd739b88c1a"),
      tx.pure.u64(nftData.number),
      tx.pure.string(nftData.image_url),
      keys,
      values,
      tx.pure.address(nftData.address),
    ]
  });

  const objectChange = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showObjectChanges: true },
  });

  dataObject.number = i + 1;
  dataObject.digest = objectChange?.digest;

  revealObject.push(dataObject);

  console.log(`NFT #${i + 1} has been revealed`);
}

writeFileSync(path.join(path_to_scripts, "../distributed_objects.json"), JSON.stringify(revealObject, null, 4))

console.log("NFT reveal complete.");