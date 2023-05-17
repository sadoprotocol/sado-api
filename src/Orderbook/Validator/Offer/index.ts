import { Order } from "../../../Entities/Order";
import { IPFSOffer, IPFSOrder } from "../../../Services/Infura";
import { OrderClosed } from "../../Exceptions/OrderException";
import { format } from "./Format";

export const offer = {
  format,
  validate,
};

async function validate(offer: IPFSOffer, order: IPFSOrder): Promise<void> {
  await hasValidOrder(order.cid);
  await hasValidOffer(offer, order);
}

async function hasValidOrder(cid: string): Promise<void> {
  const order = await Order.getByCID(cid);
  if (order && order.status === "rejected") {
    throw new OrderClosed();
  }
}

async function hasValidOffer(offer: IPFSOffer, order: IPFSOrder): Promise<void> {
  const isValidated = format.psbt(offer, order);
  if (isValidated === false) {
    format.raw(offer);
  }
}
