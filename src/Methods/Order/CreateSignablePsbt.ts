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
    const [hash, index] = utils.parse.location(location);
    const tapInternalKey = pubkey ? Buffer.from(pubkey, "hex") : undefined;
    const btcNetwork = utils.bitcoin.getBitcoinNetwork(network);

    const address = utils.bitcoin.getBitcoinAddress(maker);
    if (address === undefined) {
      throw new BadRequestError("Provided maker address is invalid");
    }

    const tx = await new Lookup(network).getTransaction(hash);
    if (tx === undefined) {
      throw new BadRequestError("Could not find transaction");
    }

    const vout = tx.vout[index];
    if (vout.scriptPubKey.address !== maker) {
      throw new BadRequestError("Provided maker address does not match location output");
    }

    const psbt = new Psbt({ network: btcNetwork });

    if (tapInternalKey !== undefined) {
      psbt.addInput({
        hash,
        index,
        witnessUtxo: {
          script: utils.taproot.getPaymentOutput(tapInternalKey, btcNetwork),
          value: 0,
        },
        tapInternalKey,
      });
    } else {
      psbt.addInput({ hash, index });
    }

    psbt.addOutput({
      script: payments.embed({ data: [Buffer.from(maker, "utf8")] }).output!,
      value: 0,
    });

    return psbt.toBase64();
  },
});
