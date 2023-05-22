import { api } from "../Api";
import { Offer } from "../Entities/Offer";
import { Order } from "../Entities/Order";
import { method } from "../JsonRpc";
import { DEFAULT_NETWORK, Network } from "../Libraries/Network";
import { OffersAnalytics } from "../Orderbook/Analytics/OffersAnalytics";
import { OrdersAnalytics } from "../Orderbook/Analytics/OrdersAnalytics";
import { Orderbook } from "../Orderbook/Orderbook";

api.register<
  {
    address: string;
    network?: Network;
  },
  OrderbookResponse
>(
  "orderbook.get",
  method(async ({ address, network = DEFAULT_NETWORK }) => {
    const orderbook = new Orderbook(address, { network });
    return orderbook.fetch();
  })
);

api.register<
  {
    address: string;
    filter: OrderFilter;
    network?: Network;
  },
  Order[]
>(
  "orderbook.orders",
  method(async ({ address, filter, network = DEFAULT_NETWORK }) => {
    return Order.query({
      address,
      network,
      ...filter,
    });
  })
);

api.register<
  {
    address: string;
    filter: OrderFilter;
    network?: Network;
  },
  Offer[]
>(
  "orderbook.offers",
  method(async ({ address, filter, network = DEFAULT_NETWORK }) => {
    return Offer.query({
      address,
      network,
      ...filter,
    });
  })
);

api.register<{
  address: string;
  network: Network;
}>(
  "orderbook.rebuild",
  method(async ({ address, network }) => {
    const orderbook = new Orderbook(address, { network });
    await orderbook.delete();
    await orderbook.resolve();
  })
);

type OrderFilter = {
  type?: "sell" | "buy";
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
