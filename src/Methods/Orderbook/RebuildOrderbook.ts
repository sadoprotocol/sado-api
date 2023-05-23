import Schema, { string } from "computed-types";

import { Offer } from "../../Entities/Offer";
import { Order } from "../../Entities/Order";
import { flushTransactions } from "../../Entities/Transaction";
import { method } from "../../JsonRpc/Method";
import { DEFAULT_NETWORK } from "../../Libraries/Network";
import { resolveOrderbookTransactions } from "../../Orderbook/Resolver";
import { validator } from "../Validator";

export const rebuildOrderbook = method({
  params: Schema({
    address: string,
    network: validator.network.optional(),
  }),
  handler: async ({ address, network = DEFAULT_NETWORK }): Promise<void> => {
    await flushTransactions(address);
    await Order.flush(address);
    await Offer.flush(address);
    await resolveOrderbookTransactions(address, network);
  },
});
