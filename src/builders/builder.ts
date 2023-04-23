import debug from "debug";
import moment from "moment";

import { hasSignature, parseLocation } from "../libraries/transaction";
import { infura } from "../services/infura";
import { lookup, Transaction } from "../services/lookup";
import { OrderBook } from "./orderbook";
import { OrderBookOffer, OrderBookOrder } from "./types";

const log = debug("sado-orderbook-builder");

type Options = {};

export class OrderBookBuilder {
  readonly orderbook = new OrderBook();

  readonly orders: OrderBookOrder[] = [];
  readonly offers: OrderBookOffer[] = [];

  constructor(readonly address: string, readonly options: Options = {}) {}

  /*
   |--------------------------------------------------------------------------------
   | Resolvers
   |--------------------------------------------------------------------------------
   */

  async resolve(): Promise<this> {
    log(`${this.address}: Resolving Orderbook`);

    const txs = await lookup.transactions(this.address);
    if (txs.length === 0) {
      return this;
    }

    log(`${this.address}: Found ${txs.length} transactions`);

    await this.#process(txs);
    await this.#build();

    return this;
  }

  async #process(txs: Transaction[]): Promise<void> {
    for (const tx of txs) {
      for (const vout of tx.vout) {
        const sado = parseSado(vout.scriptPubKey.utf8);
        if (sado !== undefined) {
          if (sado.type === "order") {
            await this.#handleOrder(sado.cid);
          } else if (sado.type === "offer") {
            await this.#handleOffer(sado.cid);
          }
        }
      }
    }
  }

  /*
   |--------------------------------------------------------------------------------
   | Handlers
   |--------------------------------------------------------------------------------
   */

  async #handleOrder(cid: string) {
    const order = await infura.getOrder(cid);
    if ("error" in order) {
      return this.orderbook.rejected.orderInfuraException(cid, order.error, order.data);
    }

    const owner = await getOwner(order.location);
    if (owner === undefined) {
      return this.orderbook.rejected.orderOwnerInvalid(cid, order);
    }

    if (order.type === "sell" && owner === order.maker) {
      this.#push(cid, "order", order);
    }
  }

  async #handleOffer(cid: string) {
    const offer = await infura.getOffer(cid);
    if ("error" in offer) {
      return this.orderbook.rejected.offerInfuraException(cid, offer.error, offer.data);
    }

    const order = await infura.getOrder(offer.origin);
    if ("error" in order) {
      return this.orderbook.rejected.offerOriginNotFound(cid, offer);
    }

    offer.order = order; // attach the order to the offer for downstream references

    const owner = await getOwner(order.location);
    if (owner === undefined) {
      return this.orderbook.rejected.offerOwnerInvalid(cid, offer);
    }

    if (hasSignature(offer.offer) === false) {
      return this.orderbook.rejected.offerSignatureInvalid(cid, offer);
    }

    if (owner === order.maker || owner === offer.taker) {
      this.#push(cid, "offer", offer);
    }
  }

  async #push(cid: string, type: "order" | "offer", item?: any): Promise<void> {
    if (item.type === "buy") {
      item.buy = true;
      item.sell = false;
    } else {
      item.buy = false;
      item.sell = true;
    }
    item.ago = moment(item.ts).fromNow();
    if (type === "order") {
      item.cid = cid;
      this.orders.push(item);
    } else if (type === "offer") {
      item.cid = cid;
      this.offers.push(item);
    }
  }

  /*
   |--------------------------------------------------------------------------------
   | Build
   |--------------------------------------------------------------------------------
   |
   | Once all orders and offers have been resolved, we can build the final result
   | of the orderbook.
   |
   */

  async #build(): Promise<void> {
    log(`${this.address}: Building Orderbook`);
    for (const order of this.orders) {
      await this.orderbook.addOrder(order);
    }
    for (const offer of this.offers) {
      await this.orderbook.addOffer(offer);
    }
  }
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function getOwner(location: string): Promise<string | undefined> {
  const [txid, vout] = parseLocation(location);
  const tx = await lookup.transaction(txid);
  if (tx === undefined) {
    return undefined;
  }
  return tx.vout[vout]?.scriptPubKey?.address;
}

/*
 |--------------------------------------------------------------------------------
 | Parsers
 |--------------------------------------------------------------------------------
 */

/**
 * Get order item from a vout scriptPubKey utf8 string.
 *
 * A valid order item contains a value in the format of `sado=order:cid` or `sado=offer:cid`.
 *
 * @param utf8 - ScriptPubKey utf8 string.
 *
 * @returns Order item or `undefined` if not found.
 */
function parseSado(utf8?: string): SadoOrder | undefined {
  if (utf8?.includes("sado=") === true) {
    const vs = utf8.split("=");
    const [type, cid] = vs[1].split(":");
    if (type === "order" || type === "offer") {
      return { type, cid };
    }
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type SadoOrder = {
  type: "order" | "offer";
  cid: string;
};
