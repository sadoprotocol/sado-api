import Schema, { number, unknown } from "computed-types";

import { method } from "../../JsonRpc/Method";
import { validator } from "../Validator";

export const makeSellOrder = method({
  params: Schema({
    network: validator.network,
    location: validator.ipfs.location,
    cardinals: number,
    maker: validator.btc.address,
    expiry: number.optional(),
    meta: unknown.object().optional(),
    fees: {
      listing: number,
      network: number,
    },
  }),
  handler: async (params) => {
    return params;
  },
});
