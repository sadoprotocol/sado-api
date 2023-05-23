import Schema, { string } from "computed-types";

import { BadRequestError, NotFoundError } from "../../JsonRpc";
import { method } from "../../JsonRpc/Method";
import { utils } from "../../Orderbook/Utilities";
import { ipfs } from "../../Services/IPFS";

export const decodeOffer = method({
  params: Schema({
    cid: string,
  }),
  handler: async ({ cid }) => {
    const data = await ipfs.getOffer(cid);
    if ("error" in data) {
      throw new NotFoundError();
    }
    const psbt = utils.psbt.decode(data.offer);
    if (psbt !== undefined) {
      return { type: "psbt", offer: psbt };
    }
    const tx = utils.raw.decode(data.offer);
    if (tx !== undefined) {
      return { type: "raw", offer: tx };
    }
    throw new BadRequestError();
  },
});
