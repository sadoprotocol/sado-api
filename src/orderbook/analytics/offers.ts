import { PriceList } from "../../libraries/pricelist";
import { Offer } from "../../services/infura";
import { getAskingPrice } from "../utilities";
import { Collections } from "./collections";

export class OffersAnalytics {
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

  addPending(offer: Offer) {
    const price = getAskingPrice(offer.order);
    this.#collections.addCollection(offer.order, price);
    this.addTotal(price);
    this.#pending.count += 1;
    this.#pending.total.increment(price);
  }

  addCompleted(offer: Offer) {
    const price = getAskingPrice(offer.order);
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
