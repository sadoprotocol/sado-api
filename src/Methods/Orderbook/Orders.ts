import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { DEFAULT_NETWORK } from "../../Libraries/Network";
import { Order } from "../../Models/Order";
import { validate } from "../../Validators";

export const getOrderbookOrders = method({
  params: Schema({
    address: string,
    network: validate.schema.network.optional(),
    filter: Schema({
      type: validate.schema.type.optional(),
      status: validate.schema.status.optional(),
    }).optional(),
  }),
  handler: async ({ address, filter, network = DEFAULT_NETWORK }): Promise<Order[]> => {
    return Order.query({
      address,
      network,
      ...filter,
    });
  },
});
