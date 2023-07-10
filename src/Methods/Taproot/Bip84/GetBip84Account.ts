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
    path: string.optional(),
  }),
  handler: async ({ network, mnemonic, account, path }) => {
    const masterNode = utils.taproot.getMasterNode(mnemonic, network);

    let wallet = Wallet.fromBase58(utils.taproot.getBip84Account(masterNode, network, account).toBase58(), network);
    if (path !== undefined) {
      wallet = Wallet.fromPrivateKey(wallet.privateKey!.toString("hex"), network).derive(path);
    }

    return {
      privateKey: wallet.privateKey?.toString("hex"),
      publicKey: wallet.publicKey.toString("hex"),
      xPublicKey: wallet.internalPubkey.toString("hex"),
      address: wallet.address,
    };
  },
});
