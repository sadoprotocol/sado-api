import Schema, { string } from "computed-types";

import { Offer } from "../../Entities/Offer";
import { Order } from "../../Entities/Order";
import { method } from "../../JsonRpc/Method";
import { DEFAULT_NETWORK, Network } from "../../Libraries/Network";
import { PriceList } from "../../Libraries/PriceList";
import { OrderbookAnalytics } from "../../Orderbook/Analytics";
import { OffersAnalytics } from "../../Orderbook/Analytics/OffersAnalytics";
import { OrdersAnalytics } from "../../Orderbook/Analytics/OrdersAnalytics";
import { isMonitoring } from "../../Orderbook/Monitor";
import { resolveOrderbook } from "../../Orderbook/Resolver";
import { validator } from "../Validator";

export const getOrderbook = method({
  params: Schema({
    address: string,
    network: validator.network.optional(),
  }),
  handler: async ({ address, network = DEFAULT_NETWORK }): Promise<Orderbook> => {
    return getOrderbookByAddress(address, network);
  },
});

export async function getOrderbookByAddress(address: string, network: Network): Promise<Orderbook> {
  const ts = performance.now();

  if ((await isMonitoring(address, network)) === false) {
    await resolveOrderbook(address, network);
  }

  const orders = await Order.getByAddress(address, network);
  const offers = await Offer.getByAddress(address, network);

  const duplicates: any = {};
  const response: Orderbook = {
    ts: 0,
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

  response.ts = (performance.now() - ts) / 1_000;

  return response;
}

type Orderbook = {
  ts: number;
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
