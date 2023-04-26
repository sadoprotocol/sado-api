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

  constructor(readonly address: string, readonly options: Options) {
    this.orders = new Orders(options.network);
    this.offers = new Offers(options.network);
  }

  get network() {
    return this.options.network;
  }

  async resolve(): Promise<this> {
    log(`${this.network}: Resolving Orderbook`);

    const txs = await lookup.transactions(this.address, this.network);
    if (txs.length === 0) {
      return this;
    }

    log(`${this.network}: Found ${txs.length} transactions`);

    await this.#process(txs);

    return this;
  }

  async #process(txs: Transaction[]): Promise<void> {
    for (const tx of txs) {
      for (const vout of tx.vout) {
        const sado = parseSado(vout.scriptPubKey.utf8);
        if (sado !== undefined) {
          if (sado.type === "order") {
            await this.orders.push(sado.cid, getAddressVoutValue(tx, this.address));
          } else if (sado.type === "offer") {
            await this.offers.push(sado.cid, getAddressVoutValue(tx, this.address));
          }
        }
      }
    }
  }

  toJSON() {
    return {
      analytics: {
        orders: this.orders.analytics,
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
