import Schema, { string } from "computed-types";

import { method } from "../../JsonRpc/Method";
import { DEFAULT_NETWORK } from "../../Libraries/Network";
import { getOrderbookAnalytics as getAnalytics } from "../../Orderbook/Providers/Analytics";
import { validator } from "../Validator";

export const getOrderbookAnalytics = method({
  params: Schema({
    address: string,
    network: validator.network.optional(),
  }),
  handler: async ({ address, network = DEFAULT_NETWORK }) => {
    return getAnalytics(address, network);
  },
});
