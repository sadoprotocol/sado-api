import { IPFSOrder } from "../Collections/IPFS";
import { PriceList } from "../Libraries/PriceList";
import { utils } from "../Utilities";
import { Collections } from "./Collections";

export class OffersAnalytics {
  readonly #collections = new Collections();

  readonly #pending = {
    count: 0,
    value: new PriceList(),
    total: new PriceList(),
  };

  readonly #completed = {
    count: 0,
    value: new PriceList(),
    total: new PriceList(),
  };

  #count = 0;
  #value = new PriceList();
  #total = new PriceList();

  get value() {
    return this.#value.sat;
  }

  get total() {
    return this.#total.sat;
  }

  addPending(order: IPFSOrder, value: number) {
    const price = utils.order.getPrice(order);
    this.#collections.addCollection(order, price);
    this.addTotal(price, value);
    this.#pending.count += 1;
    this.#pending.value.increment(value);
    this.#pending.total.increment(price);
  }

  addCompleted(order: IPFSOrder, value: number) {
    const price = utils.order.getPrice(order);
    this.addTotal(price, value);
    this.#completed.count += 1;
    this.#completed.value.increment(value);
    this.#completed.total.increment(price);
  }

  addTotal(price: number, value: number) {
    this.#count += 1;
    this.#value.increment(value);
    this.#total.increment(price);
  }

  toJSON() {
    return {
      collections: this.#collections.toValue(),
      pending: this.#pending,
      completed: this.#completed,
      count: this.#count,
      value: this.#value,
      total: this.#total,
    };
  }
}
