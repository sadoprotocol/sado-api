import { api } from "../../Api";
import { getOrderbookAnalytics } from "./Analytics";
import { getOrderbook } from "./GetOrderbook";
import { getOrderbookOffers } from "./Offers";
import { getOrderbookOrders } from "./Orders";
import { rebuildOrderbook } from "./RebuildOrderbook";

api.register("orderbook.getAnalytics", getOrderbookAnalytics);
api.register("orderbook.getOrderbook", getOrderbook);
api.register("orderbook.getOrders", getOrderbookOrders);
api.register("orderbook.getOffers", getOrderbookOffers);
api.register("orderbook.rebuild", rebuildOrderbook);
