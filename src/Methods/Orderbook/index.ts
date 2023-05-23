import { api } from "../../Api";
import { getOrderbookAnalytics } from "./Analytics";
import { getOrderbook } from "./GetOrderbook";
import { getOrderbookOffers } from "./Offers";
import { getOrderbookOrders } from "./Orders";
import { rebuildOrderbook } from "./RebuildOrderbook";

api.register("orderbook.analytics", getOrderbookAnalytics);
api.register("orderbook.get", getOrderbook);
api.register("orderbook.orders", getOrderbookOrders);
api.register("orderbook.offers", getOrderbookOffers);
api.register("orderbook.rebuild", rebuildOrderbook);
