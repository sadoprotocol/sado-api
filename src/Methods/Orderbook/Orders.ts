import Schema, { string } from "computed-types";

import { Order } from "../../Collections/Order";
import { method } from "../../Libraries/JsonRpc/Method";
import { DEFAULT_NETWORK } from "../../Libraries/Network";
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
