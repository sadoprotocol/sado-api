import { getTransaction, Transaction } from "../Entities/Transaction";
import { BTC_TO_SAT } from "../Libraries/Bitcoin";
import { Network } from "../Libraries/Network";
import { PriceList } from "../Libraries/PriceList";
import { parseLocation } from "../Libraries/Transaction";
import { IPFSOffer, IPFSOrder } from "../Services/Infura";
import { lookup } from "../Services/Lookup";

/**
 * Get order item from a vout scriptPubKey utf8 string.
 *
 * A valid order item contains a value in the format of `sado=order:cid` or `sado=offer:cid`.
 *
 * @param utf8 - ScriptPubKey utf8 string.
 *
 * @returns Order item or `undefined` if not found.
 */
export function parseSado(utf8?: string):
  | {
      type: "order" | "offer";
      cid: string;
    }
  | undefined {
  if (utf8?.includes("sado=") === true) {
    const vs = utf8.split("=");
    const [type, cid] = vs[1].split(":");
    if (type === "order" || type === "offer") {
      return { type, cid };
    }
  }
}

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
export async function getOrderOwner(order: IPFSOrder, network: Network): Promise<string | undefined> {
  const [txid, vout] = parseLocation(order.location);
  const tx = await getTransaction(txid, network);
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
export function getOrderPrice(order: IPFSOrder): PriceList | undefined {
  if (order.satoshis) {
    return new PriceList(parseInt(order.satoshis));
  } else if (order.cardinals) {
    return new PriceList(parseInt(order.cardinals));
  }
}

/**
 * Get the asking price a seller wants for their item.
 *
 * @param order - Order to get the asking price from.
 *
 * @returns The asking price in cardinals or 0 for trades.
 */
export function getAskingPrice(order: IPFSOrder): number {
  if (order.satoshis !== undefined) {
    return parseInt(order.satoshis);
  }
  if (order.cardinals !== undefined) {
    return parseInt(order.cardinals);
  }
  return 0;
}

/**
 * Get confirmed transaction from takers list of transactions.
 *
 * @param txid    - Order location transaction id.
 * @param order   - Order which the offer is based on.
 * @param offer   - Offer to get transaction for.
 * @param network - Network to lookup transaction on.
 *
 * @returns Transaction if found, undefined otherwise.
 */
export async function getTakerTransaction(
  txid: string,
  order: IPFSOrder,
  offer: IPFSOffer,
  network: Network
): Promise<Transaction | undefined> {
  const txs = await lookup.transactions(offer.taker, network);
  for (const tx of txs) {
    for (const vin of tx.vin) {
      const value = getAskingPrice(order);
      if (
        vin.txid === txid &&
        tx.vout[0]?.scriptPubKey.address === offer.taker &&
        tx.vout[1]?.scriptPubKey.address === order.maker &&
        tx.vout[1]?.value === value / BTC_TO_SAT
      ) {
        return tx;
      }
    }
  }
}
