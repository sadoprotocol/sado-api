import { BadRequestError, method } from "@valkyr/api";
import Schema, { number, string } from "computed-types";

import { Wallet } from "../../../Libraries/Wallet";
import { validate } from "../../../Validators";

export const getBip84Address = method({
  params: Schema({
    network: validate.schema.network,
    from: string,
    key: string,
    type: validate.schema.bip84.type,
    index: number,
  }),
  handler: async ({ from, key, type, index, network }) => {
    switch (from) {
      case "privateKey": {
        const wallet = Wallet.fromPrivateKey(key, network)[type](index);
        return wallet.address;
      }
      case "publicKey": {
        const wallet = Wallet.fromPublicKey(key, network)[type](index);
        return wallet.address;
      }
      default: {
        throw new BadRequestError("Unknown wallet parser type provided");
      }
    }
  },
});
