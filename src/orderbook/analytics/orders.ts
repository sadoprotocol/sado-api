import { Order } from "../../services/infura";

export class OrdersAnalytics {
  readonly #collections: Collections = {};

  readonly #pending = {
    total: 0,
    volume: 0,
  };

  readonly #completed = {
    total: 0,
    volume: 0,
  };

  #total = 0;
  #volume = 0;

  addPending(order: Order) {
    const price = getAskingPrice(order);
    this.addCollection(order, price);
    this.addTotal(price);
    this.#pending.total += 1;
    this.#pending.volume += price;
  }

  addCompleted(order: Order) {
    const price = getAskingPrice(order);
    this.addTotal(price);
    this.#completed.total += 1;
    this.#completed.volume += price;
  }

  addCollection(order: Order<{ collection?: string }>, price: number): void {
    const collection = order.meta?.collection;
    if (collection === undefined) {
      return; // not part of collection, so we can skip this analytics step
    }
    if (this.#collections[collection] === undefined) {
      this.#collections[collection] = {
        total: 0,
        floor: 0,
        volume: 0,
      };
    }
    this.#collections[collection].total += 1;
    this.#collections[collection].volume += price;
    if (this.#collections[collection].floor === 0 || price < this.#collections[collection].floor) {
      this.#collections[collection].floor = price;
    }
  }

  addTotal(price: number) {
    this.#total += 1;
    this.#volume += price;
  }

  toJSON() {
    return {
      collections: this.#collections,
      pending: this.#pending,
      completed: this.#completed,
      total: this.#total,
      volume: this.#volume,
    };
  }
}

/**
 * Get the asking price a seller wants for their item.
 *
 * @param order - Order to get the asking price from.
 *
 * @returns The asking price in cardinals or 0 for trades.
 */
export function getAskingPrice(order: Order): number {
  if (order.satoshis !== undefined) {
    return parseInt(order.satoshis);
  }
  if (order.cardinals !== undefined) {
    return parseInt(order.cardinals);
  }
  return 0;
}

type Collections = {
  [key: string]: Collection;
};

type Collection = {
  total: number;
  floor: number;
  volume: number;
};
