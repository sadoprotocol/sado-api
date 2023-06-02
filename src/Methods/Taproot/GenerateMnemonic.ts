import { method } from "../../Libraries/JsonRpc";
import { utils } from "../../Utilities";

export const generateMnemonic = method({
  handler: async () => {
    return utils.taproot.generateMnemonic();
  },
});
