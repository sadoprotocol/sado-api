import type { Network } from "../libraries/network";
import type { Offers } from "./offers";
import { Order, OrderContext } from "./order";

export class Orders {
  readonly list: Order[] = [];

  constructor(readonly network: Network) {}

  /*
   |--------------------------------------------------------------------------------
   | Handlers
   |--------------------------------------------------------------------------------
   */

  /**
   * Add a new order and perform initial resolution and price list assignments. This
   * is part of a multi step process for full resolution of an order.
   *
   * @see linkOffers    - Link offers to orders, used to perform fulfillment checks.
   * @see fulfillOrders - Final fulfillment checks and order completion.
   *
   * @param cid     - IPFS CID of the order.
   * @param context - Orderbook context.
   */
  async addOrder(cid: string, context: OrderContext): Promise<void> {
    const order = await Order.from(cid, context);
    if (order === undefined) {
      return; // no order found under this cid, reject or skip?
    }
    await order.resolve();
    this.list.push(order);
  }

  /**
   * Links resolved offers to their respective order. This is used to assign meta
   * data and for future fulfillment checks.
   *
   * @see fulfillOrders - Final fulfillment checks and order completion.
   *
   * @param offers - Orderbook offers instance.
   */
  async linkOffers(offers: Offers) {
    const map = offers.map;
    for (const order of this.list) {
      const offer = map[order.data.location];
      if (offer !== undefined) {
        order.offers.count += 1;
        order.offers.cids.push(offer.cid);
      }
    }
  }

  /**
   * Loop through any pending order and perform final fulfillment checks.
   */
  async fulfillOrders(): Promise<void> {
    const promises = [];
    for (const order of this.list) {
      if (order.status === "pending") {
        promises.push(order.fulfill());
      }
    }
    await Promise.all(promises);
  }
}
