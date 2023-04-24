import moment from "moment";

import { parseLocation } from "../libraries/transaction";
import { infura, Order } from "../services/infura";
import { lookup, Vout } from "../services/lookup";
import {
  ContentMissingException,
  InfuraException,
  InvalidOrderMakerException,
  InvalidOwnerLocationException,
  TransactionNotFoundException,
  VoutOutOfRangeException,
} from "./exceptions";
import { ItemContent, ItemRejectedStatus, ItemStatus } from "./types";

export class Orders {
  readonly #items: OrderItem[] = [];

  /*
   |--------------------------------------------------------------------------------
   | Accessors
   |--------------------------------------------------------------------------------
   */

  get items() {
    return this.#items;
  }

  /*
   |--------------------------------------------------------------------------------
   | Handlers
   |--------------------------------------------------------------------------------
   */

  async push(cid: string): Promise<void> {
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

    const [txid, voutN] = parseLocation(order.location);

    // ### Validate Order

    const tx = await lookup.transaction(txid);
    if (tx === undefined) {
      return this.#reject(cid, order, new TransactionNotFoundException(txid));
    }

    const vout = tx.vout.find((item) => item.n === voutN);
    if (vout === undefined) {
      return this.#reject(cid, order, new VoutOutOfRangeException(voutN));
    }

    if (hasOrdinalsAndInscriptions(vout) === false) {
      return this.#reject(cid, order, new ContentMissingException());
    }

    // ### Add Order

    this.#add(cid, order, vout, "pending"); // [TODO] Get completion status of the order ...
  }

  #add(cid: string, order: Order, vout: Vout, status: "pending" | "completed"): void {
    this.#items.push({
      status,
      cid,
      ago: moment(order.ts).fromNow(),
      ...this.#getTypeMap(order),
      ...order,
      ordinals: vout.ordinals,
      inscriptions: vout.inscriptions,
    });
  }

  #reject(cid: string, order: Order, reason: ItemRejectedStatus["reason"]): void {
    this.#items.push({
      status: "rejected",
      reason,
      cid,
      ago: moment(order.ts).fromNow(),
      ...this.#getTypeMap(order),
      ...order,
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

type OrderItem = ItemStatus & { cid: string; ago: string; buy: boolean; sell: boolean } & Order & ItemContent;
