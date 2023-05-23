import Schema, { string } from "computed-types";

import { Order } from "../../Entities/Order";
import { method } from "../../JsonRpc/Method";
import { DEFAULT_NETWORK } from "../../Libraries/Network";
import { validator } from "../Validator";

export const getOrderbookOrders = method({
  params: Schema({
    address: string,
    network: validator.network.optional(),
    filter: Schema({
      type: validator.ipfs.type.optional(),
      status: validator.ipfs.status.optional(),
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
