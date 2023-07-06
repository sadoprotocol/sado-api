import { method } from "@valkyr/api";
import Schema, { number, string } from "computed-types";

import { Wallet } from "../../../Libraries/Wallet";
import { utils } from "../../../Utilities";
import { validate } from "../../../Validators";

export const getBip84Account = method({
  params: Schema({
    network: validate.schema.network,
    mnemonic: string,
    account: number,
  }),
  handler: async ({ mnemonic, account, network }) => {
    const masterNode = utils.taproot.getMasterNode(mnemonic, network);
    const wallet = Wallet.fromBase58(utils.taproot.getBip84Account(masterNode, network, account).toBase58(), network);
    return {
      key: wallet.privateKey?.toString("hex"),
    };
  },
});
