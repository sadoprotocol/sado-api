import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { DEFAULT_NETWORK } from "../../Libraries/Network";
import { hasValidToken } from "../../Middleware/HasValidToken";
import { Offer } from "../../Models/Offer";
import { Order } from "../../Models/Order";
import { flushTransactions } from "../../Models/Transaction";
import { resolveOrderbook } from "../../Orderbook/Resolver";
import { validate } from "../../Validators";

export const rebuildOrderbook = method({
  params: Schema({
    address: string,
    network: validate.schema.network.optional(),
  }),
  actions: [hasValidToken],
  handler: async ({ address, network = DEFAULT_NETWORK }): Promise<void> => {
    await flushTransactions(address);
    await Order.flush(address);
    await Offer.flush(address);
    await resolveOrderbook(address, network);
  },
});
