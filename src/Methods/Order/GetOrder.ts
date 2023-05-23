import Schema, { string } from "computed-types";

import { NotAcceptableError } from "../../JsonRpc";
import { method } from "../../JsonRpc/Method";
import { ipfs } from "../../Services/IPFS";

export const getOrder = method({
  params: Schema({
    cid: string,
  }),
  handler: async ({ cid }) => {
    const order = await ipfs.getOrder(cid);
    if ("error" in order) {
      throw new NotAcceptableError(order.error, order.data);
    }
    return order;
  },
});