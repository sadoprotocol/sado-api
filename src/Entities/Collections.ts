import { getAskingPrice } from "../Orderbook/Utilities";
import { IPFSOrder } from "../Services/Infura";
import { db } from "../Services/Mongo";

export const collections = db.collection<Collection>("collections");

export async function addCollection(address: string, order: IPFSOrder): Promise<void> {
  const meta = getCollectionMeta(order.meta);
  if (meta === undefined) {
    return; // not part of collection, so we can skip this analytics step
  }
  await collections
    .insertOne({
      address,
      location: order.location,
      collection: meta.collection,
      name: meta.name,
      description: meta.description,
      price: getAskingPrice(order),
    })
    .catch((error) => {
      if (error.code === 11000) {
        return; // duplicate, skip this ...
      }
      throw error;
    });
}

function getCollectionMeta(meta?: Record<string, any>):
  | {
      collection: string;
      name?: string;
      description?: string;
    }
  | undefined {
  if (meta === undefined) {
    return undefined;
  }
  const result: Pick<Collection, "collection" | "name" | "description"> = {
    collection: meta["collection"],
    name: meta["name"] ?? "",
    description: meta["description"] ?? "",
  };
  if (result.collection === undefined) {
    return undefined;
  }
  return result;
}

type Collection = {
  /**
   * Address the collection belongs to.
   */
  address: string;

  /**
   * Location of inscription being sold in the format `txid:vout`.
   */
  location: string;

  /**
   * Collection identifier.
   */
  collection: string;

  /**
   * Item name.
   */
  name?: string;

  /**
   * Item description.
   */
  description?: string;

  /**
   * Price of the item in satoshis.
   */
  price: number;
};

// type CollectionAnalytics = {
//   /**
//    * Number of inscriptions in collection.
//    */
//   count: number;

//   /**
//    * Lowest price of collection item in satoshis.
//    */
//   floor: number;

//   /**
//    * Total value of collection in satoshis.
//    */
//   total: number;
// };

/*
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
*/
