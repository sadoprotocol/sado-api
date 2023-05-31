import * as btc from "bitcoinjs-lib";
import Schema, { string } from "computed-types";

import { BadRequestError } from "../../Libraries/JsonRpc";
import { method } from "../../Libraries/JsonRpc/Method";
import { Lookup } from "../../Services/Lookup";
import { utils } from "../../Utilities";
import { validate } from "../../Validators";

export const getPSBT = method({
  params: Schema({
    network: validate.schema.network,
    location: validate.schema.location,
    maker: string,
  }),
  handler: async ({ network, location, maker }) => {
    const [hash, index] = utils.parse.location(location);

    const address = utils.bitcoin.getBitcoinAddress(maker);
    if (address === undefined) {
      throw new BadRequestError("Provided maker address is invalid");
    }

    if (address.type === "p2pkh") {
      throw new BadRequestError(
        "P2PKH addresses are not supported for PSBT signatures, please use message signing instead."
      );
    }

    const tx = await new Lookup(network).getTransaction(hash);
    if (tx === undefined) {
      throw new BadRequestError("Could not find transaction");
    }

    const vout = tx.vout[index];
    if (vout.scriptPubKey.address !== maker) {
      throw new BadRequestError("Provided maker address does not match location output");
    }

    const psbt = new btc.Psbt({ network: utils.bitcoin.getBitcoinNetwork(network) });
    psbt.addInput({ hash, index, nonWitnessUtxo: Buffer.from(tx.hex, "hex") });
    psbt.addOutput({
      script: btc.payments.embed({ data: [Buffer.from(maker, "utf8")] }).output!,
      value: 0,
    });
    return psbt.toBase64();
  },
});
