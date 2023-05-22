import { api } from "../Api";
import { IPFSOrder } from "../Entities/IPFS";
import { method, NotAcceptableError } from "../JsonRpc";
import { ipfs } from "../Services/IPFS";

api.register<
  {
    cid: string;
  },
  IPFSOrder
>(
  "order.get",
  method(async ({ cid }) => {
    const order = await ipfs.getOrder(cid);
    if ("error" in order) {
      throw new NotAcceptableError(order.error, order.data);
    }
    return order;
  })
);
