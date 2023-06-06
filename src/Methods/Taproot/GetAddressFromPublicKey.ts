import Schema, { string } from "computed-types";

import { method } from "../../Libraries/JsonRpc";
import { Wallet } from "../../Libraries/Wallet";
import { validate } from "../../Validators";

export const getAddressFromPublicKey = method({
  params: Schema({
    pubkey: string,
    network: validate.schema.network,
  }),
  handler: async ({ pubkey, network }) => {
    return Wallet.fromPublicKey(pubkey, network).address;
  },
});
