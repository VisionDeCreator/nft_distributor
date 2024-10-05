import dotenv from 'dotenv';
import { Transaction } from '@mysten/sui/transactions';
import { client, admin_keypair, parse_amount, find_one_by_type } from './helpers.js';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';
const { execSync } = require('child_process');

const keypair = admin_keypair();
const path_to_scripts = dirname(fileURLToPath(import.meta.url));
const path_to_contracts = path.join(path_to_scripts, "../../sources");

const { modules, dependencies } = JSON.parse(
    execSync(
        `~/.cargo/bin/sui move build --dump-bytecode-as-base64 --path ${path_to_contracts}`,
        { encoding: "utf-8" }
    )
)

console.log("Deploying contracts...");
console.log(`Deploying from ${keypair.toSuiAddress()}`);

const tx = new Transaction();

const [upgradeCap] = tx.publish({ modules, dependencies });
tx.transferObjects([upgradeCap], keypair.getPublicKey().toSuiAddress());

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

console.log("objectChanges", objectChanges);


console.log(`Spent ${Math.abs(parse_amount(balanceChanges[0].amount))} on deploy`);

const published_change = objectChanges.find(change => change.type == "published");
if (published_change?.type !== "published") {
    console.log("Error: Did not find correct published change")
    process.exit(1)
}

// get package id and shareobject in json format 
export const deployed_address = {
    packageId: published_change.packageId,
    digest: published_change.digest,
    distributor: {
        distributor: "",
        distributorCap: "",
        policy_cap: "",
        policy: "",
        publisher: ""
    }
}

// Get listed_types shareobjects
const distributor = `${deployed_address.packageId}::distributor::Distributor`

const distributor_id = find_one_by_type(objectChanges, distributor)
if (!distributor_id) {
    console.log("Error: Could not find distributor object")
    process.exit(1)
}

deployed_address.distributor.distributor = distributor_id;

const distributor_cap = `${deployed_address.packageId}::distributor::DistributorCap`

const distributor_cap_id = find_one_by_type(objectChanges, distributor_cap)
if (!distributor_cap_id) {
    console.log("Error: Could not find distributor_cap_id object")
    process.exit(1)
}

deployed_address.distributor.distributorCap = distributor_cap_id;


// Get Water_Cooler_Policy
const policy = `0x2::transfer_policy::TransferPolicy<${deployed_address.packageId}::rinoco::Rinoco>`

const policy_id = find_one_by_type(objectChanges, policy)
if (!policy_id) {
    console.log("Error: Could not find policy object ")
    process.exit(1)
}

deployed_address.distributor.policy = policy_id;

// Get Water_Cooler_Policy_Cap
const policy_cap = `0x2::transfer_policy::TransferPolicyCap<${deployed_address.packageId}::rinoco::Rinoco>`

const policy_cap_id = find_one_by_type(objectChanges, policy_cap)
if (!policy_cap_id) {
    console.log("Error: Could not find policycap object ")
    process.exit(1)
}

deployed_address.distributor.policy_cap = policy_cap_id;

// Get imagePublisher share object 

const water_cooler_publisher = `0x2::package::Publisher`

const water_cooler_publisher_id = find_one_by_type(objectChanges, water_cooler_publisher)

if (!water_cooler_publisher_id) {
    console.log("Error: Could not find water_cooler_publisher")
    process.exit(1)
}

deployed_address.distributor.publisher = water_cooler_publisher_id;

writeFileSync(path.join(path_to_scripts, "../deployed_objects.json"), JSON.stringify(deployed_address, null, 4))
writeFileSync(path.join(path_to_scripts, "../deployed_object_change.json"), JSON.stringify(objectChanges, null, 4))