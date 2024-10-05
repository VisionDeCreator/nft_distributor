import { KioskClient, Network, TransferPolicyTransaction, percentageToBasisPoints } from "@mysten/kiosk";
import { Transaction } from "@mysten/sui/transactions";
import { client, admin_keypair } from './helpers.js';


(async () => {
  try {
    console.log("calling...");

    const keypair = admin_keypair();
    const packageId = "";

    const kioskClient = new KioskClient({
      client: client,
      network: Network.TESTNET,
    });
    const nftPolicyCaps = await kioskClient.getOwnedTransferPoliciesByType({
      type: `${packageId}::rinoco::Rinoco`,
      address: keypair.toSuiAddress(),
    });    

    const txb = new Transaction();

    txb.setGasBudget(1000000000);

    // You can choose to use any of the caps you have. For this example, use the first one.
    const tpTx = new TransferPolicyTransaction({
      kioskClient,
      transactionBlock: txb,
      transaction: txb,
      cap: nftPolicyCaps[0],
    });

    // A demonstration of using all the available rule add/remove functions.
    // You can chain these commands.
    tpTx
      //.addFloorPriceRule(MIST_PER_SUI * 50n) // 50 sui floor price
      .addLockRule()
      .addRoyaltyRule(percentageToBasisPoints(5), 0)
      .addPersonalKioskRule()
      //.removeFloorPriceRule();
      //.removeLockRule();
    // .removeRoyaltyRule()
    //.removePersonalKioskRule()

    // Sign and execute transaction block.
    const response = await client.signAndExecuteTransaction({
      transaction: txb,
      signer: keypair,
    });

    console.log(response);
  } catch (e) {
    console.log(e);
  }
})();
