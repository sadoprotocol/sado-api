import { Psbt } from "bitcoinjs-lib";
import Schema, { string } from "computed-types";

import { method } from "../../Libraries/JsonRpc";

export const psbtToBase64 = method({
  params: Schema({
    psbt: string,
  }),
  handler: async (params) => {
    return Psbt.fromHex(params.psbt).toBase64();
  },
});
