import { method } from "@valkyr/api";

import { utils } from "../../Utilities";

export const createWallet = method({
  handler: async () => {
    return utils.taproot.generateMnemonic();
  },
});
