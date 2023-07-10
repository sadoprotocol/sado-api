import { BadRequestError, method } from "@valkyr/api";
import { payments, Psbt } from "bitcoinjs-lib";
import Schema, { string } from "computed-types";

import { Lookup } from "../../Services/Lookup";
import { utils } from "../../Utilities";
import { validate } from "../../Validators";

export const createSignablePsbt = method({
  params: Schema({
    network: validate.schema.network,
    location: validate.schema.location,
    maker: string,
    pubkey: string.optional(),
  }),
  handler: async ({ network, location, maker, pubkey }) => {
    const lookup = new Lookup(network);

    const psbt = new Psbt({ network: lookup.btcnetwork });
    const [hash, index] = utils.parse.location(location);

    // ### Location
    // Ensure that the location the signature is being created for exists and
    // belongs to the maker.

    const tx = await lookup.getTransaction(hash);
    if (tx === undefined) {
      throw new BadRequestError("Could not find transaction");
    }

    const vout = tx.vout[index];
    if (vout.scriptPubKey.address !== maker) {
      throw new BadRequestError("Provided maker address does not match location output");
    }

    // ### Input
    // Add transaction input to the PSBT. Determine the input structure based
    // on the address type of the provided maker.

    const type = utils.bitcoin.getAddressType(maker);

    if (type === undefined) {
      throw new BadRequestError("Provided maker address does not match supported address types.");
    }

    switch (type) {
      case "taproot": {
        if (pubkey === undefined) {
          throw new BadRequestError("Taproot address requires a pubkey");
        }
        const tapInternalKey = Buffer.from(pubkey, "hex");
        if (tapInternalKey.length !== 32) {
          throw new BadRequestError("Taproot pubkey must be 32 bytes");
        }
        psbt.addInput({
          hash,
          index,
          witnessUtxo: {
            script: utils.taproot.getPaymentOutput(tapInternalKey, lookup.btcnetwork),
            value: 0,
          },
          tapInternalKey,
        });
        break;
      }

      case "bech32": {
        psbt.addInput({
          hash,
          index,
          witnessUtxo: {
            script: Buffer.from(vout.scriptPubKey.hex, "hex"),
            value: 0,
          },
        });
        break;
      }

      default: {
        psbt.addInput({ hash, index });
      }
    }

    // ### Output
    // Add transaction output to the PSBT. The output is a empty OP_RETURN output
    // with the maker address as the value.

    psbt.addOutput({
      script: payments.embed({ data: [Buffer.from(maker, "utf8")] }).output!,
      value: 0,
    });

    return psbt.toBase64();
  },
});
