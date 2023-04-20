import * as bitcoinjs from "bitcoinjs-lib";
import moment from "moment";

import { config } from "../config";
import { infura, Offer, Order } from "../services/infura";
import { Inscription, lookup, Ordinal, Transaction } from "../services/lookup";
import { redis } from "../services/redis";

export class OrderBook {
  readonly cids: {
    orders: string[];
    offers: string[];
  } = {
    orders: [],
    offers: [],
  };

  readonly orders: OrderBookOrder[] = [];
  readonly offers: OrderBookOffer[] = [];
  readonly rejects: OrderBookReject[] = [];

  readonly filtered: {
    orders: Order[];
    offers: Offer[];
  } = {
    orders: [],
    offers: [],
  };

  #orderCount = 0;
  #offerCount = 0;
  #rejectCount = 0;

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
    return this.#rejectCount;
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

    this.#resolveCids(txs);

    // const cachedOrderBook = await this.#getCache();
    // if (cachedOrderBook !== undefined) {
    //   return cachedOrderBook;
    // }

    await this.#processOrders();
    await this.#processOffers();

    return this;
  }

  #resolveCids(txs: Transaction[]): void {
    for (let i = 0; i < txs.length; i++) {
      for (let t = 0; t < txs[i].vout.length; t++) {
        const utf8 = txs[i]?.vout[t]?.scriptPubKey.utf8;
        if (utf8?.includes("sado=") === true) {
          const vs = utf8.split("=");
          const [type, cid] = vs[1].split(":");
          if (type === "order") {
            this.cids.orders.push(cid);
          } else if (type === "offer") {
            this.cids.offers.push(cid);
          }
        }
      }
    }
  }

  /*
   |--------------------------------------------------------------------------------
   | Processors
   |--------------------------------------------------------------------------------
   */

  async #processOrders(): Promise<void> {
    if (this.cids.orders.length === 0) {
      return; // no orders to resolve
    }
    for (let i = 0; i < this.cids.orders.length; i++) {
      const order = await infura.getOrder(this.cids.orders[i]);
      if (order !== undefined) {
        const owner = await getOwner(order.location);
        if (order.type === "sell" && owner === order.maker) {
          await this.#filter(i, "order", order);
        } else {
          await this.#filter(i, "order");
        }
      } else {
        await this.#filter(i, "order");
      }
    }
  }

  async #processOffers(): Promise<void> {
    if (this.cids.offers.length === 0) {
      return; // no offers to resolve
    }
    for (let i = 0; i < this.cids.offers.length; i++) {
      const offer = await infura.getOffer(this.cids.offers[i]);
      if (offer !== undefined) {
        if (hasOfferSignature(offer.offer) === true) {
          const origin = await infura.getOrder(offer.origin);
          if (origin !== undefined) {
            offer.order = origin;
            const owner = await getOwner(origin.location);
            if (owner === origin.maker || owner === offer.taker) {
              await this.#filter(i, "offer", offer);
            } else {
              await this.#filter(i, "offer");
            }
          }
        } else {
          await this.#filter(i, "offer");
        }
      } else {
        await this.#filter(i, "offer");
      }
    }
  }

  async #getCache() {
    const redisKey = `/${config.network}/sado/get/${this.address}/orders-offers/${this.cids.orders.length}-${this.cids.offers.length}`;
    const gotCache = await redis.get({ key: redisKey });
    if (gotCache) {
      return gotCache;
    }
  }

  /*
   |--------------------------------------------------------------------------------
   | Filters
   |--------------------------------------------------------------------------------
   */

  async #filter(index: any, type: "order" | "offer", item?: any) {
    this.#increment(type);

    if (item === undefined) {
      return this.#finalize();
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
      item.cid = this.cids.orders[index];
      this.orders.push(item);
    } else if (type === "offer") {
      item.cid = this.cids.offers[index];
      this.offers.push(item);
    }

    // ### Finalize

    await this.#finalize();
  }

  async #finalize(): Promise<void> {
    const isFinal = this.#offerCount === this.cids.offers.length && this.#orderCount === this.cids.orders.length;
    if (isFinal === false) {
      return;
    }

    // ### Finalize Orders

    for (let i = 0; i < this.orders.length; i++) {
      const vArg = this.orders[i].location.split(":");
      const txid = vArg[0];
      const vout_n = parseInt(vArg[1]);

      const tx = await lookup.transaction(txid);
      if (tx === undefined) {
        // [TODO] Determine how to handle missing transactions.
        throw new Error(`OrderBook Panic! Transaction not found for txid '${txid}'.`);
      }

      const voutIndex = tx.vout.findIndex((item: any) => {
        return item.n === vout_n;
      });

      if (tx.vout[voutIndex].ordinals.length > 0 && tx.vout[voutIndex].inscriptions.length > 0) {
        this.orders[i].ordinals = tx.vout[voutIndex].ordinals;
        this.orders[i].inscriptions = tx.vout[voutIndex].inscriptions;
        this.filtered.orders.push(this.orders[i]);
      }
    }

    // ### Finalize Offers

    for (let i = 0; i < this.offers.length; i++) {
      const order = this.offers[i].order;
      if (order === undefined) {
        // [TODO] Determine how to handle missing transactions.
        throw new Error(`OrderBook Panic! Order not resolved for offer '${this.offers[i].origin}'.`);
      }
      const vArg = order.location.split(":");
      const txid = vArg[0];
      const vout_n = parseInt(vArg[1]);

      const tx = await lookup.transaction(txid);
      if (tx === undefined) {
        // [TODO] Determine how to handle missing transactions.
        throw new Error(`OrderBook Panic! Transaction not found for txid '${txid}'.`);
      }

      const voutIndex = tx.vout.findIndex((item: any) => {
        return item.n === vout_n;
      });

      if (tx.vout[voutIndex].ordinals.length > 0 && tx.vout[voutIndex].inscriptions.length > 0) {
        this.offers[i].ordinals = tx.vout[voutIndex].ordinals;
        this.offers[i].inscriptions = tx.vout[voutIndex].inscriptions;
        this.filtered.offers.push(this.offers[i]);
      }
    }
  }

  #increment(type: "order" | "offer"): void {
    if (type === "order") {
      this.#orderCount++;
    } else if (type === "offer") {
      this.#offerCount++;
    }
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

type OrderBookOrder = Order & OrderBookResponse;

type OrderBookOffer = Offer & OrderBookResponse;

type OrderBookReject = {
  code: string;
  message: string;
  origin: Order | Offer;
};

type OrderBookResponse = {
  ordinals: Ordinal[];
  inscriptions: Inscription[];
};
