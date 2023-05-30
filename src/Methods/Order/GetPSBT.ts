import * as btc from "bitcoinjs-lib";
import Schema, { string } from "computed-types";

import { BadRequestError } from "../../JsonRpc";
import { method } from "../../JsonRpc/Method";
import { parseLocation } from "../../Libraries/Transaction";
import { Lookup } from "../../Services/Lookup";
import { getBitcoinAddress, getBitcoinNetwork } from "../../Utilities/Bitcoin";
import { validator } from "../Validator";

export const getPSBT = method({
  params: Schema({
    network: validator.network,
    location: validator.ipfs.location,
    maker: string,
  }),
  handler: async ({ network, location, maker }) => {
    const [hash, index] = parseLocation(location);

    const address = getBitcoinAddress(maker);
    if (address === undefined) {
      throw new BadRequestError("Provided maker address is invalid");
    }

    if (address.type !== "p2pkh") {
      throw new BadRequestError(
        "P2PKH addresses are not supported for PSBT signatures, please use message signing instead."
      );
    }

    const tx = await new Lookup(network).getTransaction(hash);
    if (tx === undefined) {
      throw new BadRequestError("Could not find transaction");
    }

    const psbt = new btc.Psbt({ network: getBitcoinNetwork(network) });
    psbt.addInput({ hash, index, nonWitnessUtxo: Buffer.from(tx.hex, "hex") });
    psbt.addOutput({
      script: btc.payments.embed({ data: [Buffer.from(maker, "utf8")] }).output!,
      value: 0,
    });
    return psbt.toBase64();
  },
});
