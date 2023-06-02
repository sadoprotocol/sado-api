import Schema, { number, string } from "computed-types";

import { method } from "../../Libraries/JsonRpc";
import { utils } from "../../Utilities";
import { validate } from "../../Validators";

export const getAccountKey = method({
  params: Schema({
    mnemonic: string,
    account: number,
    network: validate.schema.network,
  }),
  handler: async ({ mnemonic, account, network }) => {
    const masterNode = utils.taproot.getMasterNode(mnemonic, network);
    return utils.taproot.getAccountKey(masterNode, account);
  },
});
