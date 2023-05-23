import debug from "debug";

import { Offer } from "../Entities/Offer";
import { Order } from "../Entities/Order";
import { flushTransactions } from "../Entities/Transaction";
import { Network } from "../Libraries/Network";
import { PriceList } from "../Libraries/PriceList";
import { OffersAnalytics } from "./Analytics/OffersAnalytics";
import { OrdersAnalytics } from "./Analytics/OrdersAnalytics";
import { isMonitoring, monitorAddress } from "./Monitor/Queue";
import { OrderbookAnalytics } from "./Providers/Analytics";
import { resolveOrderbookTransactions } from "./Resolver";

const log = debug("sado-orderbook");

export class Orderbook {
  readonly ts: number[] = [];

  constructor(readonly address: string, readonly options: Options) {}

  get network() {
    return this.options.network;
  }

  async resolve(): Promise<this> {
    log(`${this.network}: Resolving Orderbook ${this.address}`);

    const t = performance.now();
    await resolveOrderbookTransactions(this.address, this.network);
    this.ts.push(performance.now() - t);

    log(`${this.network}: Resolved Orderbook ${this.address}`);

    monitorAddress(this.address, this.network);

    return this;
  }

  async fetch() {
    log(`${this.network}: Fetching Orderbook ${this.address}`);

    if ((await isMonitoring(this.address, this.network)) === false) {
      await this.resolve();
    }

    const t = performance.now();
    const orders = await Order.getByAddress(this.address, this.network);
    const offers = await Offer.getByAddress(this.address, this.network);

    const duplicates: any = {};
    const response: OrderbookResponse = {
      ts: [],
      analytics: {
        orders: new OrdersAnalytics(),
        offers: new OffersAnalytics(),
        total: {
          value: new PriceList(),
          price: new PriceList(),
        },
      },
      pending: {
        orders: [],
        offers: [],
      },
      rejected: {
        orders: [],
        offers: [],
      },
      completed: {
        orders: [],
        offers: [],
      },
    };

    for (const order of orders) {
      if (order.status === "pending") {
        const duplicateIndex = duplicates[order.order.location];
        if (duplicateIndex === undefined) {
          duplicates[order.order.location] = response.pending.orders.length;
        } else {
          response.pending.orders[duplicateIndex].value.increment(order.value ?? 0);
          continue;
        }
        response.analytics.orders.addPending(order.order, order.value ?? 0);
      }
      if (order.status === "completed") {
        response.analytics.orders.addCompleted(order.order, order.value ?? 0);
      }
      response[order.status].orders.push(order.toJSON());
    }

    for (const offer of offers) {
      response[offer.status].offers.push(offer.toJSON());
      if (offer.status === "pending") {
        response.analytics.offers.addPending(offer.order, offer.value ?? 0);
      }
      if (offer.status === "completed") {
        response.analytics.offers.addCompleted(offer.order, offer.value ?? 0);
      }
    }

    response.analytics.total.value.set(response.analytics.orders.value + response.analytics.offers.value);
    response.analytics.total.price.set(response.analytics.orders.total + response.analytics.offers.total);

    this.ts.push(performance.now() - t);

    response.ts = this.ts.map((t) => t / 1_000);

    return response;
  }

  async delete() {
    await flushTransactions(this.address);
    await Order.flush(this.address);
    await Offer.flush(this.address);
  }
}

type Options = {
  network: Network;
};

type OrderbookResponse = {
  ts: number[];
  analytics: OrderbookAnalytics;
  pending: {
    orders: ReturnType<Order["toJSON"]>[];
    offers: ReturnType<Offer["toJSON"]>[];
  };
  rejected: {
    orders: ReturnType<Order["toJSON"]>[];
    offers: ReturnType<Offer["toJSON"]>[];
  };
  completed: {
    orders: ReturnType<Order["toJSON"]>[];
    offers: ReturnType<Offer["toJSON"]>[];
  };
};
