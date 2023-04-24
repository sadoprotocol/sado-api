import debug from "debug";

import { lookup, Transaction } from "../services/lookup";
import { Offers } from "./offers";
import { Orders } from "./orders";

const log = debug("sado-orderbook-builder");

type Options = {};

export class OrderBook {
  readonly orders = new Orders();
  readonly offers = new Offers();

  constructor(readonly address: string, readonly options: Options = {}) {}

  async resolve(): Promise<this> {
    log(`${this.address}: Resolving Orderbook`);

    const txs = await lookup.transactions(this.address);
    if (txs.length === 0) {
      return this;
    }

    log(`${this.address}: Found ${txs.length} transactions`);

    await this.#process(txs);

    return this;
  }

  async #process(txs: Transaction[]): Promise<void> {
    for (const tx of txs) {
      for (const vout of tx.vout) {
        const sado = parseSado(vout.scriptPubKey.utf8);
        if (sado !== undefined) {
          if (sado.type === "order") {
            await this.orders.push(sado.cid);
          } else if (sado.type === "offer") {
            await this.offers.push(sado.cid);
          }
        }
      }
    }
  }

  toJSON() {
    return {
      orders: this.orders.items,
      offers: this.offers.items,
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
