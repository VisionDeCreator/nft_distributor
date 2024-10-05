module rinoco::distributor {
    // === Imports ===

    use std::string::{Self, String};
    use sui::{
        display,
        transfer_policy,
        event,
        kiosk::{Self},
        transfer_policy::{TransferPolicy},
        table::{Self, Table},
    };

    use rinoco::{
      rinoco::{Self, Rinoco},
      attributes::{Self},
    };

    // === Structs ===

    public struct DISTRIBUTOR has drop {}

    public struct Distributor has key, store {
        id: UID,
        supply: u16,
        counter: u16,
        name: String,
        description: String,
        registry: Table<u16, ID>,
        is_complete: bool
    }

    public struct NFTMinted has copy, drop {
        nft_id: ID,
        kiosk_id: ID,
        minter: address,
    }
    

    // === Error ===

    const EDistributingComplete: u64 = 0;
    const ERinocoAlreadyDistributed: u64 = 1;


    public struct DistributorCap has key { id: UID }

        // === Public mutative functions ===

    #[allow(lint(share_owned))]
    fun init(otw: DISTRIBUTOR, ctx: &mut TxContext) {
        // Claim the Publisher object.
        let publisher = sui::package::claim(otw, ctx);

        let mut display = display::new<Rinoco>(&publisher, ctx);
        display::add(&mut display, string::utf8(b"name"), string::utf8(b"{collection_name} #{number}"));
        display::add(&mut display, string::utf8(b"description"), string::utf8(b"{description}"));
        display::add(&mut display, string::utf8(b"image_url"), string::utf8(b"{image_url}"));
        display::add(&mut display, string::utf8(b"attributes"), string::utf8(b"{attributes}"));
        display::update_version(&mut display);

        let (policy, policy_cap) = transfer_policy::new<Rinoco>(&publisher, ctx);
        
        transfer::public_transfer(publisher, ctx.sender());
        transfer::public_transfer(policy_cap,ctx.sender());
        transfer::public_transfer(display, ctx.sender());

        transfer::public_share_object(policy);


        transfer::transfer(Distributor {
            id: object::new(ctx),
            supply: 1500,
            counter: 0,
            name: string::utf8(b"Rinoco"),
            description: string::utf8(b"Welcome to the wonderful world of Rinoco, where amazing and wondrous creatures live."),
            registry: table::new(ctx),
            is_complete: false
        }, ctx.sender());
        
        transfer::transfer(DistributorCap {
            id: object::new(ctx),
        }, ctx.sender());
    }

    // === Public view functions ===


    // === Package functions ===

    #[allow(lint(share_owned))]
    public entry fun send_nft(
        _: &DistributorCap,
        self: &mut Distributor,
        policy: &TransferPolicy<Rinoco>,
        number: u64,
        image_url: String,
        keys: vector<String>,
        values: vector<String>,
        owner: address,
        ctx: &mut TxContext,
    ) {
        assert!(self.counter <= self.supply, EDistributingComplete);
        assert!(!self.registry.contains(number as u16), ERinocoAlreadyDistributed);

        let attributes = attributes::admin_new(keys, values, ctx);            

        let nft: Rinoco = rinoco::new(
            number,
            self.name,
            self.description,
            option::some(image_url),
            option::some(attributes),
            ctx,
        );

        let (mut kiosk, kiosk_owner_cap) = kiosk::new(ctx);

        event::emit(NFTMinted { 
            nft_id: object::id(&nft),
            kiosk_id: object::id(&kiosk),
            minter: owner,
        });

        kiosk.lock(&kiosk_owner_cap, policy, nft);

        // Transfer the kiosk owner capability to the owner
        transfer::public_transfer(kiosk_owner_cap, owner);

        // Share the kiosk object publicly
        transfer::public_share_object(kiosk);


        self.counter = self.counter + 1;

        if (self.counter == self.supply) {
            self.is_complete = true;
        };
    }
}
