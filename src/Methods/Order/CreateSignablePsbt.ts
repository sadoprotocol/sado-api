import { payments, Psbt } from "bitcoinjs-lib";
import Schema, { string } from "computed-types";

import { BadRequestError } from "../../Libraries/JsonRpc";
import { method } from "../../Libraries/JsonRpc/Method";
import { Wallet } from "../../Libraries/Wallet";
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

    const psbt = new Psbt({ network: utils.bitcoin.getBitcoinNetwork(network) });

    if (pubkey !== undefined) {
      const wallet = Wallet.fromPublicKey(pubkey, network);
      psbt.addInput({
        hash,
        index,
        witnessUtxo: {
          script: wallet.output,
          value: 0,
        },
        tapInternalKey: wallet.internalPubkey,
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
