import Schema from "computed-types";

import { method } from "../../Libraries/JsonRpc";
import { utils } from "../../Utilities";
import { validate } from "../../Validators";

export const createTaprootAddress = method({
  params: Schema({
    network: validate.schema.network,
  }),
  handler: async ({ network }) => {
    return utils.taproot.getNewAddress(network);
  },
});
