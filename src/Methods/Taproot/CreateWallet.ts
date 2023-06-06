import { method } from "../../Libraries/JsonRpc";
import { utils } from "../../Utilities";

export const createWallet = method({
  handler: async () => {
    return utils.taproot.generateMnemonic();
  },
});
