import dotenv from 'dotenv';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import type { SuiObjectChange } from "@mysten/sui/client";
import { fromB64 } from "@mysten/sui/utils";
import chalk from 'chalk';

export interface IObjectInfo {
    type: string | undefined;
    id: string | undefined;
}

dotenv.config();

export const admin_keypair = () => {
    try{
      const keypair = Ed25519Keypair.deriveKeypair(process.env.SEED_PHRASE!);
      return keypair;
    } catch (e: unknown) {
      // we need to use unknown because error can be anything(null, number, {}, undefined)
      if (e instanceof Error) {
        if (e.message === "Invalid mnemonic type: undefined") {
          console.error(`${chalk.red.bold("[Error]")} Please set up the mnemonic in the .env file to start working with Flow or use the command ${chalk.green.bold("flow create-address")} to create a new wallet.`);
        } else {
          console.log(e.message)
        }
      }
      process.exit(1) // to stop code
    }
  }

export const user1_keypair = () => {
    const privkey = process.env.PRIVATE_KEY_USER_1
    if (!privkey) {
        console.log("Error: DEPLOYER_B64_PRIVKEY not set as env variable.")
        process.exit(1)
    }
    const keypair = Ed25519Keypair.fromSecretKey(fromB64(privkey).slice(1))
    return keypair
}

export const client = new SuiClient({ url: getFullnodeUrl('devnet') });

export const parse_amount = (amount: string) => {
    return parseInt(amount) / 1_000_000_000;
}

export const find_one_by_type = (changes: SuiObjectChange[], type: string) => {
    const object_change = changes.find(change => change.type === "created" && 'objectType' in change && change.objectType === type);
    if (object_change?.type === "created") {
        return object_change.objectId;
    }
}
