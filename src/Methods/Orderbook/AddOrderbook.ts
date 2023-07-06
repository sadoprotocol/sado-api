import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { DEFAULT_NETWORK } from "../../Libraries/Network";
import { hasValidToken } from "../../Middleware/HasValidToken";
import { resolveOrderbook } from "../../Orderbook/Resolver";
import { validate } from "../../Validators";

export const addOrderbook = method({
  params: Schema({
    address: string,
    network: validate.schema.network.optional(),
  }),
  actions: [hasValidToken],
  handler: async ({ address, network = DEFAULT_NETWORK }): Promise<void> => {
    await resolveOrderbook(address, network);
  },
});
