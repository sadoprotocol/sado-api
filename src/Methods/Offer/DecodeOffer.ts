import { BadRequestError, method, NotFoundError } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { ipfs } from "../../Services/IPFS";
import { utils } from "../../Utilities";

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
