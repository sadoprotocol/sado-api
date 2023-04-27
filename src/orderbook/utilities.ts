import { Network } from "../libraries/network";
import { PriceList } from "../libraries/pricelist";
import { parseLocation } from "../libraries/transaction";
import { Order } from "../services/infura";
import { lookup } from "../services/lookup";

/**
 * Get the address of the owner defined in a sado transaction location. A
 * location is provided in the format of txid:vout where the txid is the
 * transaction of the sado and the vout is the position of the owner address.
 *
 * @param location - Location of the sado transaction.
 * @param network  - Network to lookup transaction on.
 *
 * @returns Address of the owner or `undefined` if no owner is found.
 */
export async function getOrderOwner(order: Order, network: Network): Promise<string | undefined> {
  const [txid, vout] = parseLocation(order.location);
  const tx = await lookup.transaction(txid, network);
  if (tx === undefined) {
    return undefined;
  }
  return tx.vout[vout]?.scriptPubKey?.address;
}

/**
 * Convert the order asking/offering price to a sado price list instance.
 *
 * @param order - Order to get price list for.
 *
 * @returns Price list instance or `undefined` if no price is found.
 */
export async function getOrderPrice(order: Order): Promise<PriceList | undefined> {
  if (order.satoshis) {
    return new PriceList(parseInt(order.satoshis)).setUSD();
  } else if (order.cardinals) {
    return new PriceList(parseInt(order.cardinals)).setUSD();
  }
}

/**
 * Get the asking price a seller wants for their item.
 *
 * @param order - Order to get the asking price from.
 *
 * @returns The asking price in cardinals or 0 for trades.
 */
export function getAskingPrice(order: Order): number {
  if (order.satoshis !== undefined) {
    return parseInt(order.satoshis);
  }
  if (order.cardinals !== undefined) {
    return parseInt(order.cardinals);
  }
  return 0;
}
