import { IPFSOrder } from "../../Collections/IPFS";
import { Lookup } from "../../Services/Lookup";
import { parse } from "../Parse";
import { createOrderPsbt } from "./CreateOrderPsbt";
import { toHex } from "./OrderPayload";

export const order = {
  create: createOrderPsbt,
  getOwner: getOrderOwner,
  getPrice: getOrderPrice,
  toHex,
};

/**
 * Get the asking price a seller wants for their item.
 *
 * @param order - Order to get the asking price from.
 *
 * @returns The asking price in cardinals or 0 for trades.
 */
function getOrderPrice(order: IPFSOrder): number {
  if (order.cardinals !== undefined) {
    return order.cardinals;
  }
  return 0;
}

/**
 * Get the address of the owner defined in a sado transaction location. A
 * location is provided in the format of txid:vout where the txid is the
 * transaction of the sado and the vout is the position of the owner address.
 *
 * @param location - Location of the sado transaction.
 * @param lookup   - Lookup service to get transaction from.
 *
 * @returns Address of the owner or `undefined` if no owner is found.
 */
async function getOrderOwner(order: IPFSOrder, lookup: Lookup): Promise<string | undefined> {
  const [txid, vout] = parse.location(order.location);
  const tx = await lookup.getTransaction(txid);
  if (tx === undefined) {
    return undefined;
  }
  return tx.vout[vout]?.scriptPubKey?.address;
}
