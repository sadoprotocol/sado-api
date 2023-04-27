import debug from "debug";

import { Network } from "../libraries/network";
import { getAddressVoutValue } from "../libraries/transaction";
import { lookup, Transaction } from "../services/lookup";
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
    await this.#price();

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
    const promises = [];
    for (const tx of txs) {
      for (const vout of tx.vout) {
        const sado = parseSado(vout.scriptPubKey.utf8);
        if (sado !== undefined) {
          if (sado.type === "order") {
            promises.push(this.orders.addOrder(sado.cid, getAddressVoutValue(tx, this.address)));
          } else if (sado.type === "offer") {
            promises.push(this.offers.addOffer(sado.cid, getAddressVoutValue(tx, this.address)));
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

  async #price() {
    const t = performance.now();
    await Promise.all([this.orders.setPriceList(), this.offers.setPriceList()]);
    this.ts.push(performance.now() - t);
  }

  toJSON() {
    return {
      ts: this.ts.map((t) => t / 1_000),
      analytics: {
        orders: this.orders.analytics,
        offers: this.offers.analytics,
      },
      pending: {
        orders: this.orders.pending,
        offers: this.offers.pending,
      },
      rejected: {
        orders: this.orders.rejected,
        offers: this.offers.rejected,
      },
      completed: {
        orders: this.orders.completed,
        offers: this.offers.completed,
      },
    };
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
