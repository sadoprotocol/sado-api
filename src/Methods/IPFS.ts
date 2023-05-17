import { api } from "../Api";
import { IPFSOffer, IPFSOrder } from "../Entities/IPFS";
import { method, NotAcceptableError } from "../JsonRpc";
import { ipfs } from "../Services/IPFS";

api.register<
  {
    cid: string;
  },
  IPFSOrder
>(
  "GetOrder",
  method(async ({ cid }) => {
    const order = await ipfs.getOrder(cid);
    if ("error" in order) {
      throw new NotAcceptableError(order.error, order.data);
    }
    return order;
  })
);

api.register<
  {
    cid: string;
  },
  IPFSOffer
>(
  "GetOffer",
  method(async ({ cid }) => {
    const offer = await ipfs.getOffer(cid);
    if ("error" in offer) {
      throw new NotAcceptableError(offer.error, offer.data);
    }
    return offer;
  })
);
