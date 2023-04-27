import { Order } from "../../services/infura";

export class Collections {
  readonly #collections: CollectionsMap = {};

  addCollection(order: Order<{ collection?: string }>, price: number): void {
    const collection = order.meta?.collection;
    if (collection === undefined) {
      return; // not part of collection, so we can skip this analytics step
    }
    if (this.#collections[collection] === undefined) {
      this.#collections[collection] = {
        count: 0,
        floor: 0,
        total: 0,
      };
    }
    this.#collections[collection].count += 1;
    this.#collections[collection].total += price;
    if (this.#collections[collection].floor === 0 || price < this.#collections[collection].floor) {
      this.#collections[collection].floor = price;
    }
  }

  toValue() {
    return this.#collections;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type CollectionsMap = {
  [key: string]: Collection;
};

type Collection = {
  count: number;
  floor: number;
  total: number;
};
