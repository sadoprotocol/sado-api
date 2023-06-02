import Schema, { number, string } from "computed-types";

import { method } from "../../Libraries/JsonRpc";
import { utils } from "../../Utilities";
import { validate } from "../../Validators";

export const getAddress = method({
  params: Schema({
    account: string,
    index: number,
    type: Schema.either("receiving" as const, "change" as const).error("Expected value to be 'receiving' or 'change'"),
    network: validate.schema.network,
  }),
  handler: async ({ account, index, type, network }) => {
    const wallet = utils.taproot.getWallet(account, network);
    return wallet.getAddress(index, type);
  },
});
