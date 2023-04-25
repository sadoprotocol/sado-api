import debug from "debug";
import moment from "moment";

import { parseLocation } from "../libraries/transaction";
import { infura, Order } from "../services/infura";
import { lookup, Vout } from "../services/lookup";
import {
  InfuraException,
  InvalidOrderMakerException,
  InvalidOwnerLocationException,
  OrdinalNotFoundException,
  VoutOutOfRangeException,
} from "./exceptions";
import { ItemContent, ItemException } from "./types";

const log = debug("sado-orders");

export class Orders {
  readonly #pending: OrderItem[] = [];
  readonly #rejected: RejectedOrderItem[] = [];
  readonly #completed: OrderItem[] = [];

  /*
   |--------------------------------------------------------------------------------
   | Accessors
   |--------------------------------------------------------------------------------
   */

  get pending() {
    return this.#pending;
  }

  get rejected() {
    return this.#rejected;
  }

  get completed() {
    return this.#completed;
  }

  /*
   |--------------------------------------------------------------------------------
   | Handlers
   |--------------------------------------------------------------------------------
   */

  async push(cid: string): Promise<void> {
    log(`Resolving order ${cid}`);

    const order = await infura.getOrder(cid);
    if ("error" in order) {
      return this.#reject(cid, order.data, new InfuraException(order.error, { cid }));
    }

    const owner = await getOwner(order.location);
    if (owner === undefined) {
      return this.#reject(cid, order, new InvalidOwnerLocationException(order.location));
    }

    if ((order.type === "sell" && owner === order.maker) === false) {
      return this.#reject(cid, order, new InvalidOrderMakerException(order.type, owner, order.maker));
    }

    // ### Validate Ordinal

    const [txid, voutN] = parseLocation(order.location);

    const tx = await lookup.transaction(txid);
    if (tx === undefined) {
      return this.#reject(cid, order, new OrdinalNotFoundException(txid, voutN));
    }

    const vout = tx.vout.find((item) => item.n === voutN);
    if (vout === undefined) {
      return this.#reject(cid, order, new VoutOutOfRangeException(voutN));
    }

    if (hasOrdinalsAndInscriptions(vout) === false) {
      return this.#complete(cid, order);
    }

    // ### Add Order

    this.#add(cid, order, vout);
  }

  #add(cid: string, order: Order, vout: Vout): void {
    this.#pending.push({
      ...order,
      ...this.#getTypeMap(order),
      ago: moment(order.ts).fromNow(),
      cid,
      ordinals: vout.ordinals,
      inscriptions: vout.inscriptions,
    });
  }

  #reject(cid: string, order: Order, reason: ItemException): void {
    this.#rejected.push({
      reason,
      ...order,
      ...this.#getTypeMap(order),
      ago: moment(order.ts).fromNow(),
      cid,
    });
  }

  #complete(cid: string, order: Order): void {
    this.#completed.push({
      ...order,
      ...this.#getTypeMap(order),
      ago: moment(order.ts).fromNow(),
      cid,
    });
  }

  #getTypeMap(offer: any) {
    if (offer.type === "buy") {
      return { buy: true, sell: false };
    }
    return { buy: false, sell: true };
  }
}

function hasOrdinalsAndInscriptions(vout: Vout): boolean {
  return vout.ordinals.length > 0 && vout.inscriptions.length > 0;
}

async function getOwner(location: string): Promise<string | undefined> {
  const [txid, vout] = parseLocation(location);
  const tx = await lookup.transaction(txid);
  if (tx === undefined) {
    return undefined;
  }
  return tx.vout[vout]?.scriptPubKey?.address;
}

type OrderItem = Order & { order?: Order; buy: boolean; sell: boolean; ago: string; cid: string } & ItemContent;

type RejectedOrderItem = { reason: ItemException } & OrderItem;
