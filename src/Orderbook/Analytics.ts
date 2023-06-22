import { OffersAnalytics } from "../Analytics/OffersAnalytics";
import { OrdersAnalytics } from "../Analytics/OrdersAnalytics";
import { Offer } from "../Models/Offer";
import { Order } from "../Models/Order";
import { Network } from "../Libraries/Network";
import { PriceList } from "../Libraries/PriceList";

export async function getOrderbookAnalytics(address: string, network: Network): Promise<OrderbookAnalytics> {
  const analytics = {
    orders: await getOrdersAnalytics(address, network),
    offers: await getOffersAnalytics(address, network),
    total: {
      value: new PriceList(),
      price: new PriceList(),
    },
  };

  analytics.total.value.set(analytics.orders.value + analytics.offers.value);
  analytics.total.price.set(analytics.orders.total + analytics.offers.total);

  return analytics;
}

async function getOrdersAnalytics(address: string, network: Network): Promise<OrdersAnalytics> {
  const duplicates = new Set();
  const orders = await Order.getByAddress(address, network);
  const analytics = new OrdersAnalytics();
  for (const order of orders) {
    if (order.status === "pending") {
      if (duplicates.has(order.order.location)) {
        continue;
      }
      duplicates.add(order.order.location);
      analytics.addPending(order.order, order.value ?? 0);
    }
    if (order.status === "completed") {
      analytics.addCompleted(order.order, order.value ?? 0);
    }
  }
  return analytics;
}

async function getOffersAnalytics(address: string, network: Network): Promise<OffersAnalytics> {
  const offers = await Offer.getByAddress(address, network);
  const analytics = new OffersAnalytics();
  for (const offer of offers) {
    if (offer.status === "pending") {
      analytics.addPending(offer.order, offer.value ?? 0);
    }
    if (offer.status === "completed") {
      analytics.addCompleted(offer.order, offer.value ?? 0);
    }
  }
  return analytics;
}

export type OrderbookAnalytics = {
  orders: OrdersAnalytics;
  offers: OffersAnalytics;
  total: {
    value: PriceList;
    price: PriceList;
  };
};
