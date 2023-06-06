import Schema, { number, string } from "computed-types";

import { method } from "../../../Libraries/JsonRpc";
import { Wallet } from "../../../Libraries/Wallet";
import { validate } from "../../../Validators";

export const getBip84PublicKey = method({
  params: Schema({
    account: string,
    change: number,
    index: number,
    network: validate.schema.network,
  }),
  handler: async ({ account, change, index, network }) => {
    const wallet = Wallet.fromBase58(account, network).derive(`${change}/${index}`);
    return wallet.publicKey.toString("hex");
  },
});
