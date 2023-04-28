import { PriceList } from "../../libraries/pricelist";
import { Order } from "../../services/infura";
import { getAskingPrice } from "../utilities";
import { Collections } from "./collections";

export class OrdersAnalytics {
  readonly #collections = new Collections();

  readonly #pending = {
    count: 0,
    total: new PriceList(),
  };

  readonly #completed = {
    count: 0,
    total: new PriceList(),
  };

  #count = 0;
  #total = new PriceList();

  addPending(order: Order) {
    const price = getAskingPrice(order);
    this.#collections.addCollection(order, price);
    this.addTotal(price);
    this.#pending.count += 1;
    this.#pending.total.increment(price);
  }

  addCompleted(order: Order) {
    const price = getAskingPrice(order);
    this.addTotal(price);
    this.#completed.count += 1;
    this.#completed.total.increment(price);
  }

  addTotal(price: number) {
    this.#count += 1;
    this.#total.increment(price);
  }

  toJSON() {
    return {
      collections: this.#collections.toValue(),
      pending: this.#pending,
      completed: this.#completed,
      count: this.#count,
      total: this.#total,
    };
  }
}
