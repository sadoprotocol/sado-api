import * as bitcoinjs from "bitcoinjs-lib";
import debug from "debug";
import moment from "moment";

import { infura, Offer, Order } from "../services/infura";
import { lookup, Transaction } from "../services/lookup";
import { OrderbookRejects } from "./rejects";
import { OrderBookOffer, OrderBookOrder } from "./types";

const log = debug("sado-orderbook");

export class OrderBook {
  readonly orders: OrderBookOrder[] = [];
  readonly offers: OrderBookOffer[] = [];

  readonly rejected = new OrderbookRejects();
  readonly completed = [];

  readonly filtered: {
    orders: Order[];
    offers: Offer[];
  } = {
    orders: [],
    offers: [],
  };

  #orderCount = 0;
  #offerCount = 0;
  #completeCount = 0;

  constructor(readonly address: string) {}

  /*
   |--------------------------------------------------------------------------------
   | Accessors
   |--------------------------------------------------------------------------------
   */

  get orderCount() {
    return this.#orderCount;
  }

  get offerCount() {
    return this.#offerCount;
  }

  get rejectCount() {
    return this.rejected.count;
  }

  get completeCount() {
    return this.#completeCount;
  }

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
    for (let i = 0; i < txs.length; i++) {
      for (let t = 0; t < txs[i].vout.length; t++) {
        const item = getOrderItem(txs[i]?.vout[t]?.scriptPubKey.utf8);
        if (item !== undefined) {
          if (item.type === "order") {
            await this.#handleOrder(item.cid);
          } else if (item.type === "offer") {
            await this.#handleOffer(item.cid);
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
        return this.#filter(cid, "order", order);
      }
    } else {
      this.rejected.orderNotFound(cid);
    }
    await this.#filter(cid, "order");
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
            return this.#filter(cid, "offer", offer);
          }
        } else {
          this.rejected.offerOriginNotFound(cid, offer);
        }
      } else {
        this.rejected.offerSignatureInvalid(cid, offer);
      }
    } else {
      this.rejected.offerNotFound(cid);
    }
    await this.#filter(cid, "offer");
  }

  /*
   |--------------------------------------------------------------------------------
   | Filter 
   |--------------------------------------------------------------------------------
   |
   | Filter incoming items representing orders and offers. If not item is given
   | we simply perform a count increment to keep track of processed cids.
   |
   */

  async #filter(cid: string, type: "order" | "offer", item?: any): Promise<void> {
    this.#increment(type);

    if (item === undefined) {
      return; // [TODO] Determine if we should reject here
    }

    // ### Set Buy/Sell State

    if (item.type === "buy") {
      item.buy = true;
      item.sell = false;
    } else {
      item.buy = false;
      item.sell = true;
    }

    // ### Set Timestamp

    item.ago = moment(item.ts).fromNow();

    // ### Push Order/Offer

    if (type === "order") {
      item.cid = cid;
      this.orders.push(item);
    } else if (type === "offer") {
      item.cid = cid;
      this.offers.push(item);
    }
  }

  #increment(type: "order" | "offer"): void {
    if (type === "order") {
      this.#orderCount++;
    } else if (type === "offer") {
      this.#offerCount++;
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

    // ### Finalize Orders

    for (let i = 0; i < this.orders.length; i++) {
      const order = this.orders[i];
      const [txid, n] = order.location.split(":");
      const vout_n = parseInt(n);

      const tx = await lookup.transaction(txid);
      if (tx === undefined) {
        // [TODO] Determine how to handle missing transactions.
        throw new Error(`OrderBook Panic! Transaction not found for txid '${txid}'.`);
      }

      const voutIndex = tx.vout.findIndex((item: any) => {
        return item.n === vout_n;
      });

      if (tx.vout[voutIndex].ordinals.length > 0 && tx.vout[voutIndex].inscriptions.length > 0) {
        order.ordinals = tx.vout[voutIndex].ordinals;
        order.inscriptions = tx.vout[voutIndex].inscriptions;
        this.filtered.orders.push(order);
      } else {
        this.rejected.orderMissingOrdinalsAndInscriptions(order);
      }
    }

    // ### Finalize Offers

    for (let i = 0; i < this.offers.length; i++) {
      const offer = this.offers[i];
      const order = offer.order!;
      const [txid, n] = order.location.split(":");
      const vout_n = parseInt(n);

      const tx = await lookup.transaction(txid);
      if (tx === undefined) {
        // [TODO] Determine how to handle missing transactions.
        throw new Error(`OrderBook Panic! Transaction not found for txid '${txid}'.`);
      }

      const voutIndex = tx.vout.findIndex((item: any) => {
        return item.n === vout_n;
      });

      if (tx.vout[voutIndex].ordinals.length > 0 && tx.vout[voutIndex].inscriptions.length > 0) {
        offer.ordinals = tx.vout[voutIndex].ordinals;
        offer.inscriptions = tx.vout[voutIndex].inscriptions;
        this.filtered.offers.push(offer);
      } else {
        this.rejected.offerMissingOrdinalsAndInscriptions(offer);
      }
    }
  }

  toJSON() {
    return {
      orders: this.filtered.orders,
      offers: this.filtered.offers,
      rejected: this.rejected.toJSON(),
      completed: this.completed,
    };
  }
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
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

function getOrderItem(utf8?: string): OrderItem | undefined {
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

type OrderItem = {
  type: "order" | "offer";
  cid: string;
};
