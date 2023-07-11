import { method } from "@valkyr/api";
import { Psbt } from "bitcoinjs-lib";
import Schema, { string } from "computed-types";

import { Wallet } from "../../Libraries/Wallet";
import { utils } from "../../Utilities";
import { validate } from "../../Validators";

export const signPsbt = method({
  params: Schema({
    network: validate.schema.network,
    psbt: string,
    key: string,
  }),
  handler: async (params) => {
    const wallet = Wallet.fromPrivateKey(params.key, params.network);

    const psbt = Psbt.fromBase64(params.psbt, {
      network: utils.bitcoin.getBitcoinNetwork(params.network),
    })
      .signAllInputs(wallet.signer)
      .finalizeAllInputs();

    return { psbt: psbt.toBase64() };
  },
});
