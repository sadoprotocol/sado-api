import { api } from "../Api";
import { IPFSOffer, IPFSOrder } from "../Entities/IPFS";
import { Offer, OfferStatus } from "../Entities/Offer";
import { Order, OrderStatus } from "../Entities/Order";
import { method, NotAcceptableError } from "../JsonRpc";
import { Network } from "../Libraries/Network";
import { ipfs } from "../Services/IPFS";

api.register<
  {
    address: string;
    network: Network;
    status?: OrderStatus;
  },
  IPFSOrder[]
>(
  "GetOrders",
  method(async ({ address, network, status }) => {
    const filter = status === undefined ? {} : { status };
    const orders = await Order.getByAddress(address, network, filter);
    return orders.map(({ order }) => order);
  })
);

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
    address: string;
    network: Network;
    status?: OfferStatus;
  },
  IPFSOffer[]
>(
  "GetOffers",
  method(async ({ address, network, status }) => {
    const filter = status === undefined ? {} : { status };
    const offers = await Offer.getByAddress(address, network, filter);
    return offers.map(({ offer }) => offer);
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
