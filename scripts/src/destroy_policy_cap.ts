import dotenv from 'dotenv';
import { Transaction } from '@mysten/sui/transactions';
import { client, admin_keypair, parse_amount } from './helpers.js';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

const keypair = admin_keypair();
const path_to_scripts = dirname(fileURLToPath(import.meta.url));

console.log("Destroying trasferPolicy...");
console.log(`Destroying from ${keypair.toSuiAddress()}`);

const transferPolicy = "";
const transferPolicyCap = "";

const tx = new Transaction();

tx.setGasBudget(1000000000);

const result = tx.moveCall({
    target: `0x2::transfer_policy::destroy_and_withdraw`,
    arguments: [
      tx.object(transferPolicy),
      tx.object(transferPolicyCap),
    ],
    typeArguments: ["0x72d4735b2387fb48520bba873f8132a658343c9f4612bb4684c3f99ddda3f824::rinoco::Rinoco"],
  });

  tx.transferObjects([result], tx.pure.address(keypair.toSuiAddress()));

const { objectChanges, balanceChanges } = await client.signAndExecuteTransaction({
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

if (!balanceChanges) {
    console.log("Error: Balance Changes was undefined")
    process.exit(1)
}
if (!objectChanges) {
    console.log("Error: object  Changes was undefined")
    process.exit(1)
}


console.log(`Spent ${Math.abs(parse_amount(balanceChanges[0].amount))} on deploy`);



writeFileSync(path.join(path_to_scripts, "../object_change_destroy.json"), JSON.stringify(objectChanges, null, 4))