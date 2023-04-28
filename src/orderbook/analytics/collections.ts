import { PriceList } from "../../libraries/pricelist";
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
        floor: new PriceList(),
        total: new PriceList(),
      };
    }
    this.#collections[collection].count += 1;
    this.#collections[collection].total.increment(price);
    if (this.#collections[collection].floor.sat === 0 || price < this.#collections[collection].floor.sat) {
      this.#collections[collection].floor.set(price);
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
  floor: PriceList;
  total: PriceList;
};
