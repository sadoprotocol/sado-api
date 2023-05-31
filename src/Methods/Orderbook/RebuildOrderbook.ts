import Schema, { string } from "computed-types";

import { Offer } from "../../Collections/Offer";
import { Order } from "../../Collections/Order";
import { flushTransactions } from "../../Collections/Transaction";
import { method } from "../../Libraries/JsonRpc/Method";
import { DEFAULT_NETWORK } from "../../Libraries/Network";
import { resolveOrderbook } from "../../Orderbook/Resolver";
import { validate } from "../../Validators";

export const rebuildOrderbook = method({
  params: Schema({
    address: string,
    network: validate.schema.network.optional(),
  }),
  handler: async ({ address, network = DEFAULT_NETWORK }): Promise<void> => {
    await flushTransactions(address);
    await Order.flush(address);
    await Offer.flush(address);
    await resolveOrderbook(address, network);
  },
});
