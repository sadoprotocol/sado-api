import * as bitcoinjs from "bitcoinjs-lib";
import debug from "debug";
import moment from "moment";

import { infura } from "../services/infura";
import { lookup, Transaction } from "../services/lookup";
import { OrderBook } from "./orderbook";
import { OrderBookOffer, OrderBookOrder } from "./types";

const log = debug("sado-orderbook");

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
    const txs = await lookup.transactions(this.address);
    if (txs.length === 0) {
      return this;
    }

    log("Found", txs.length, "transactions for", this.address);

    await this.#process(txs);
    await this.#build();

    return this;
  }

  async #process(txs: Transaction[]): Promise<void> {
    for (const tx of txs) {
      for (const vout of tx.vout) {
        const order = parseSadoOrder(vout.scriptPubKey.utf8);
        if (order !== undefined) {
          if (order.type === "order") {
            await this.#handleOrder(order.cid);
          } else if (order.type === "offer") {
            await this.#handleOffer(order.cid);
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
    if (order !== undefined) {
      const owner = await getOwner(order.location);

      // [TODO] Handle case where order is not a sale and owner is not the maker

      if (order.type === "sell" && owner === order.maker) {
        return this.#push(cid, "order", order);
      }
    } else {
      this.orderbook.rejected.orderNotFound(cid);
    }
  }

  async #handleOffer(cid: string) {
    const offer = await infura.getOffer(cid);
    if (offer !== undefined) {
      if (hasOfferSignature(offer.offer) === true) {
        const origin = await infura.getOrder(offer.origin);
        if (origin !== undefined) {
          offer.order = origin;
          const owner = await getOwner(origin.location);

          // [TODO] Handle cases where owner does not match either maker or taker

          if (owner === origin.maker || owner === offer.taker) {
            return this.#push(cid, "offer", offer);
          }
        } else {
          this.orderbook.rejected.offerOriginNotFound(cid, offer);
        }
      } else {
        this.orderbook.rejected.offerSignatureInvalid(cid, offer);
      }
    } else {
      this.orderbook.rejected.offerNotFound(cid);
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
    log("Building Orderbook");
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

/**
 * Check if a signature exists in the inputs of an offered transaction.
 *
 * [TODO] Verify that the signature was created by the maker of the offer.
 *
 * @param offer - Offer transaction hex.
 *
 * @returns `true` if a signature exists in the inputs of the offer transaction.
 */
function hasOfferSignature(offer: string): boolean {
  const temp_tx = bitcoinjs.Transaction.fromHex(offer);
  for (let v = 0; v < temp_tx.ins.length; v++) {
    if (temp_tx.ins[v].script.toString()) {
      return true;
    }
  }
  return false;
}

/**
 * Get order item from a vout scriptPubKey utf8 string.
 *
 * A valid order item contains a value in the format of `sado=order:cid` or `sado=offer:cid`.
 *
 * @param utf8 - ScriptPubKey utf8 string.
 *
 * @returns Order item or `undefined` if not found.
 */
function parseSadoOrder(utf8?: string): SadoOrder | undefined {
  if (utf8?.includes("sado=") === true) {
    const vs = utf8.split("=");
    const [type, cid] = vs[1].split(":");
    if (type === "order" || type === "offer") {
      return { type, cid };
    }
  }
}

async function getOwner(outpoint: string): Promise<string | undefined> {
  if (outpoint && outpoint.indexOf(":") > 0) {
    const [txid, pos] = outpoint.split(":");
    const index = parseInt(pos);
    const res = await lookup.transaction(txid);
    if (
      typeof res === "object" &&
      typeof res.vout === "object" &&
      typeof res.vout[index] === "object" &&
      typeof res.vout[index].scriptPubKey === "object" &&
      typeof res.vout[index].scriptPubKey.address !== "undefined"
    ) {
      return res.vout[index].scriptPubKey.address;
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
