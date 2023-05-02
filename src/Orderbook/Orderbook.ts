import debug from "debug";

import { Offer } from "../Entities/Offer";
import { Order } from "../Entities/Order";
import { Network } from "../Libraries/Network";
import { OffersAnalytics } from "./Analytics/OffersAnalytics";
import { OrdersAnalytics } from "./Analytics/OrdersAnalytics";
import { isMonitoring, monitorAddress } from "./Monitor";
import { resolveOrderbookTransactions } from "./Resolver";

const log = debug("sado-orderbook");

export class OrderBook {
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
        response.analytics.orders.addPending(order.order);
      }
      if (order.status === "completed") {
        response.analytics.orders.addCompleted(order.order);
      }
      response[order.status].orders.push(order.toJSON());
    }

    for (const offer of offers) {
      response[offer.status].offers.push(offer.toJSON());
      if (offer.status === "pending") {
        response.analytics.offers.addPending(offer.order);
      }
      if (offer.status === "completed") {
        response.analytics.offers.addCompleted(offer.order);
      }
    }

    this.ts.push(performance.now() - t);

    response.ts = this.ts.map((t) => t / 1_000);

    return response;
  }
}

type Options = {
  network: Network;
};

type OrderbookResponse = {
  ts: number[];
  analytics: {
    orders: OrdersAnalytics;
    offers: OffersAnalytics;
  };
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
