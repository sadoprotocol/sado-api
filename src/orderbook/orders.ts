import debug from "debug";
import moment from "moment";

import { Network } from "../libraries/network";
import { getTypeMap } from "../libraries/response";
import { hasOrdinalsAndInscriptions, parseLocation } from "../libraries/transaction";
import { infura, Order } from "../services/infura";
import { lookup, Vout } from "../services/lookup";
import { OrdersAnalytics } from "./analytics/orders";
import {
  InfuraException,
  InsufficientFundsException,
  InvalidOrderMakerException,
  InvalidOwnerLocationException,
  OrdinalNotFoundException,
  VoutOutOfRangeException,
} from "./exceptions";
import { ItemContent, ItemException } from "./types";
import { getOrderOwner } from "./utilities";

const log = debug("sado-orders");

export class Orders {
  readonly #pending: OrderItem[] = [];
  readonly #rejected: RejectedOrderItem[] = [];
  readonly #completed: OrderItem[] = [];

  readonly #analytics = new OrdersAnalytics();

  constructor(readonly network: Network) {}

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

  get analytics() {
    return this.#analytics.toJSON();
  }

  /*
   |--------------------------------------------------------------------------------
   | Handler
   |--------------------------------------------------------------------------------
   */

  async push(cid: string, value: number | undefined): Promise<void> {
    log(`Resolving order ${cid}`);

    const order = await infura.getOrder(cid);
    if ("error" in order) {
      return this.#reject(cid, order.data, new InfuraException(order.error, { cid }));
    }

    if (value === undefined) {
      return this.#reject(cid, order, new InsufficientFundsException());
    }

    const owner = await getOrderOwner(order, this.network);
    if (owner === undefined) {
      return this.#reject(cid, order, new InvalidOwnerLocationException(order.location));
    }

    if ((order.type === "sell" && owner === order.maker) === false) {
      return this.#reject(cid, order, new InvalidOrderMakerException(order.type, owner, order.maker));
    }

    // ### Validate Ordinal

    const [txid, voutN] = parseLocation(order.location);

    const tx = await lookup.transaction(txid, this.network);
    if (tx === undefined) {
      return this.#reject(cid, order, new OrdinalNotFoundException(txid, voutN));
    }

    const vout = tx.vout.find((item) => item.n === voutN);
    if (vout === undefined) {
      return this.#reject(cid, order, new VoutOutOfRangeException(voutN));
    }

    // ### Complete Order
    // Check if order is completed and add it to the complete list.

    if (hasOrdinalsAndInscriptions(vout) === false) {
      // [TODO] https://github.com/cakespecial/nodejs-sado/issues/9
      return this.#complete(cid, order, value);
    }

    // ### Pending Order

    this.#add(cid, order, vout, value);
  }

  /*
   |--------------------------------------------------------------------------------
   | Assignments
   |--------------------------------------------------------------------------------
   */

  #add(cid: string, order: Order, vout: Vout, value: number): void {
    this.#analytics.addPending(order);
    this.#pending.push({
      ...order,
      ...getTypeMap(order),
      ago: moment(order.ts).fromNow(),
      cid,
      value,
      ordinals: vout.ordinals,
      inscriptions: vout.inscriptions,
    });
  }

  #reject(cid: string, order: Order, reason: ItemException): void {
    this.#rejected.push({
      reason,
      ...order,
      ...getTypeMap(order),
      ago: moment(order.ts).fromNow(),
      cid,
    });
  }

  #complete(cid: string, order: Order, value: number): void {
    this.#analytics.addCompleted(order);
    this.#completed.push({
      ...order,
      ...getTypeMap(order),
      ago: moment(order.ts).fromNow(),
      cid,
      value,
    });
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type OrderItem = Order & {
  order?: Order;
  buy: boolean;
  sell: boolean;
  ago: string;
  cid: string;
  value: number;
} & ItemContent;

type RejectedOrderItem = { reason: ItemException } & Omit<OrderItem, "value">;
