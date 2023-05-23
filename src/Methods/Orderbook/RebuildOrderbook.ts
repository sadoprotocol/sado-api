import Schema, { string } from "computed-types";

import { method } from "../../JsonRpc/Method";
import { DEFAULT_NETWORK } from "../../Libraries/Network";
import { Orderbook } from "../../Orderbook/Orderbook";
import { validator } from "../Validator";

export const rebuildOrderbook = method({
  params: Schema({
    address: string,
    network: validator.network.optional(),
  }),
  handler: async ({ address, network = DEFAULT_NETWORK }): Promise<void> => {
    const orderbook = new Orderbook(address, { network });
    await orderbook.delete();
    await orderbook.resolve();
  },
});
