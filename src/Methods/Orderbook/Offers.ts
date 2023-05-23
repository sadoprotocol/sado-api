import Schema, { string } from "computed-types";

import { Offer } from "../../Entities/Offer";
import { method } from "../../JsonRpc/Method";
import { DEFAULT_NETWORK } from "../../Libraries/Network";
import { validator } from "../Validator";

export const getOrderbookOffers = method({
  params: Schema({
    address: string,
    network: validator.network.optional(),
    filter: Schema({
      status: validator.ipfs.status.optional(),
      "order.type": validator.ipfs.type.optional(),
    }).optional(),
  }),
  handler: async ({ address, filter, network = DEFAULT_NETWORK }): Promise<Offer[]> => {
    return Offer.query({
      address,
      network,
      ...filter,
    });
  },
});
