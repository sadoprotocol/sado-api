import { IPFSOrder } from "../../Entities/IPFS";
import { PriceList } from "../../Libraries/PriceList";

export class Collections {
  readonly #collections: CollectionsMap = {};

  addCollection(order: IPFSOrder, price: number): void {
    const collection = getCollection(order.meta);
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

function getCollection(meta?: Record<string, unknown>): string | undefined {
  if (meta === undefined) {
    return undefined;
  }
  const collection = meta["collection"];
  if (typeof collection !== "string") {
    return undefined;
  }
  return collection;
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
