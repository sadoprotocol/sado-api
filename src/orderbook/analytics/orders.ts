import { Order } from "../../services/infura";
import { getAskingPrice } from "../utilities";
import { Collections } from "./collections";

export class OrdersAnalytics {
  readonly #collections = new Collections();

  readonly #pending = {
    count: 0,
    total: 0,
  };

  readonly #completed = {
    count: 0,
    total: 0,
  };

  #count = 0;
  #total = 0;

  addPending(order: Order) {
    const price = getAskingPrice(order);
    this.#collections.addCollection(order, price);
    this.addTotal(price);
    this.#pending.count += 1;
    this.#pending.total += price;
  }

  addCompleted(order: Order) {
    const price = getAskingPrice(order);
    this.addTotal(price);
    this.#completed.count += 1;
    this.#completed.total += price;
  }

  addTotal(price: number) {
    this.#count += 1;
    this.#total += price;
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
