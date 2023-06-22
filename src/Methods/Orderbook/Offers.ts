import Schema, { string } from "computed-types";

import { method } from "../../Libraries/JsonRpc/Method";
import { DEFAULT_NETWORK } from "../../Libraries/Network";
import { Offer } from "../../Models/Offer";
import { validate } from "../../Validators";

export const getOrderbookOffers = method({
  params: Schema({
    address: string,
    network: validate.schema.network.optional(),
    filter: Schema({
      status: validate.schema.status.optional(),
      "order.type": validate.schema.type.optional(),
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
