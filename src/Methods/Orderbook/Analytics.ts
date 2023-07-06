import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { DEFAULT_NETWORK } from "../../Libraries/Network";
import { getOrderbookAnalytics as getAnalytics } from "../../Orderbook/Analytics";
import { validate } from "../../Validators";

export const getOrderbookAnalytics = method({
  params: Schema({
    address: string,
    network: validate.schema.network.optional(),
  }),
  handler: async ({ address, network = DEFAULT_NETWORK }) => {
    return getAnalytics(address, network);
  },
});
