# NFT distributor

go into the scripts folder and install the node_modules using bun.

Then go into the src folder modify the .env.dev file to .env and add a SEED_PHRASE="" the wallet should have testnet tokens on it.

Then run:
bun run publish.ts
and
bun run distribute_nfts.ts

And that will deploy the contracts and create some NFTs and send them to the address that is associated with the "address" attribute in the metadata found in the file found here scripts/src/data/metadata.json