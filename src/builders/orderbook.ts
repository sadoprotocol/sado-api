import { lookup, Vout } from "../services/lookup";
import { OrderbookRejects } from "./rejects";
import { OrderBookOffer, OrderBookOrder } from "./types";

export class OrderBook {
  readonly orders: OrderBookOrder[] = [];
  readonly offers: OrderBookOffer[] = [];
  readonly rejected = new OrderbookRejects();
  readonly completed: any[] = [];

  async addOrder(order: OrderBookOrder): Promise<void> {
    const [txid, voutN] = parseLocation(order.location);

    // ### Validate Order

    const tx = await lookup.transaction(txid);
    if (tx === undefined) {
      return this.rejected.orderTxNotFound(txid, order);
    }

    const vout = tx.vout.find((item) => item.n === voutN);
    if (vout === undefined) {
      return this.rejected.orderVoutOutOfRange(voutN, order);
    }

    if (hasOrdinalsAndInscriptions(vout) === false) {
      return this.rejected.orderMissingOrdinalsAndInscriptions(order);
    }

    // ### Populate Order

    order.ordinals = vout.ordinals;
    order.inscriptions = vout.inscriptions;

    this.orders.push(order);
  }

  async addOffer(offer: OrderBookOffer): Promise<void> {
    const [txid, voutN] = parseLocation(offer.order!.location);

    // ### Validate Offer

    const tx = await lookup.transaction(txid);
    if (tx === undefined) {
      return this.rejected.offerTxNotFound(txid, offer);
    }

    const vout = tx.vout.find((item) => item.n === voutN);
    if (vout === undefined) {
      return this.rejected.offerVoutOutOfRange(voutN, offer);
    }

    if (hasOrdinalsAndInscriptions(vout) === false) {
      return this.rejected.offerMissingOrdinalsAndInscriptions(offer);
    }

    // ### Populate Offer

    offer.ordinals = vout.ordinals;
    offer.inscriptions = vout.inscriptions;

    this.offers.push(offer);
  }

  toJSON() {
    return {
      orders: this.orders,
      offers: this.offers,
      rejected: this.rejected.toJSON(),
      completed: this.completed,
    };
  }
}

function hasOrdinalsAndInscriptions(vout: Vout): boolean {
  return vout.ordinals.length > 0 && vout.inscriptions.length > 0;
}

function parseLocation(location: string): [string, number] {
  const [txid, vout] = location.split(":");
  return [txid, parseInt(vout)];
}
