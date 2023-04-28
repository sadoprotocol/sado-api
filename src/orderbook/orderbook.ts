import debug from "debug";
import pLimit from "p-limit";

import { Network } from "../libraries/network";
import { lookup, Transaction } from "../services/lookup";
import { OffersAnalytics } from "./analytics/offers";
import { OrdersAnalytics } from "./analytics/orders";
import { Offers } from "./offers";
import { Orders } from "./orders";

const log = debug("sado-orderbook");

type Options = {
  network: Network;
};

export class OrderBook {
  readonly orders: Orders;
  readonly offers: Offers;

  readonly ts: number[] = [];

  constructor(readonly address: string, readonly options: Options) {
    this.orders = new Orders(options.network);
    this.offers = new Offers(options.network);
  }

  get network() {
    return this.options.network;
  }

  async resolve(): Promise<this> {
    log(`${this.network}: Resolving Orderbook`);

    const t = performance.now();

    const txs = await lookup.transactions(this.address, this.network);
    if (txs.length === 0) {
      return this;
    }

    this.ts.push(performance.now() - t);

    log(`${this.network}: Found ${txs.length} transactions`);

    await this.#process(txs);
    await this.#link();
    await this.#fulfill();

    return this;
  }

  /**
   * Loops through provided transactions and fills out the orders and offers
   * connected to the orderbook.
   *
   * @param txs - Transactions to process.
   */
  async #process(txs: Transaction[]): Promise<void> {
    const t = performance.now();
    const limit = pLimit(10);
    const promises = [];
    for (const tx of txs) {
      for (const vout of tx.vout) {
        const sado = parseSado(vout.scriptPubKey.utf8);
        if (sado !== undefined) {
          if (sado.type === "order") {
            promises.push(
              limit(() => this.orders.addOrder(sado.cid, { network: this.network, address: this.address, tx }))
            );
          } else if (sado.type === "offer") {
            promises.push(
              limit(() => this.offers.addOffer(sado.cid, { network: this.network, address: this.address, tx }))
            );
          }
        }
      }
    }
    await Promise.all(promises);
    this.ts.push(performance.now() - t);
  }

  /**
   * Loops through the orders and offers and links related data together in
   * a format improves referencing relations in clients.
   */
  async #link() {
    const t = performance.now();
    this.orders.linkOffers(this.offers);
    this.ts.push(performance.now() - t);
  }

  async #fulfill() {
    const t = performance.now();
    await this.orders.fulfillOrders();
    this.ts.push(performance.now() - t);
  }

  toJSON() {
    const response: any = {
      ts: this.ts.map((t) => t / 1_000),
      analytics: {
        orders: new OrdersAnalytics(),
        offers: new OffersAnalytics(),
      },
      pending: {
        orders: [],
        offers: [],
      },
      rejected: {
        orders: [],
        offers: [],
      },
      completed: {
        orders: [],
        offers: [],
      },
    };
    for (const order of this.orders.list) {
      response[order.status].orders.push(order.toJSON());
      if (order.status === "pending") {
        response.analytics.orders.addPending(order.data);
      }
      if (order.status === "completed") {
        response.analytics.orders.addCompleted(order.data);
      }
    }
    for (const offer of this.offers.list) {
      response[offer.status].offers.push(offer.toJSON());
      if (offer.status === "pending") {
        response.analytics.offers.addPending(offer.data);
      }
      if (offer.status === "completed") {
        response.analytics.offers.addCompleted(offer.data);
      }
    }
    return response;
  }
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
