import Schema, { string } from "computed-types";

import { NotAcceptableError } from "../../JsonRpc";
import { method } from "../../JsonRpc/Method";
import { ipfs } from "../../Services/IPFS";

export const getOffer = method({
  params: Schema({
    cid: string,
  }),
  handler: async ({ cid }) => {
    const offer = await ipfs.getOffer(cid);
    if ("error" in offer) {
      throw new NotAcceptableError(offer.error, offer.data);
    }
    return offer;
  },
});
