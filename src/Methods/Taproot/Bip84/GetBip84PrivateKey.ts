import { method } from "@valkyr/api";
import Schema, { number, string } from "computed-types";

import { Wallet } from "../../../Libraries/Wallet";
import { validate } from "../../../Validators";

export const getBip84PrivateKey = method({
  params: Schema({
    network: validate.schema.network,
    key: string,
    type: validate.schema.bip84.type,
    index: number,
  }),
  handler: async ({ key, type, index, network }) => {
    const wallet = Wallet.fromPrivateKey(key, network)[type](index);
    return wallet.privateKey?.toString("hex");
  },
});
