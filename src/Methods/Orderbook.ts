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
  "GetOrderbook",
  method(async ({ address, network = DEFAULT_NETWORK }) => {
    const orderbook = new Orderbook(address, { network });
    return orderbook.fetch();
  })
);

api.register<{
  address: string;
  network: Network;
}>(
  "RebuildOrderbook",
  method(async ({ address, network }) => {
    const orderbook = new Orderbook(address, { network });
    await orderbook.delete();
    await orderbook.resolve();
  })
);

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
