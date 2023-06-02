import Schema, { string } from "computed-types";

import { method } from "../../Libraries/JsonRpc";
import { utils } from "../../Utilities";
import { validate } from "../../Validators";

export const recoverTaprootAddress = method({
  params: Schema({
    mnemonic: string,
    network: validate.schema.network,
  }),
  handler: async ({ mnemonic, network }) => {
    return utils.taproot.getAddressFromMnemonic(mnemonic, network);
  },
});
