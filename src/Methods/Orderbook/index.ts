import { api } from "../../Api";
import { getOrderbookAnalytics } from "./Analytics";
import { getOrderbook } from "./GetOrderbook";
import { getOrderbookOffers } from "./Offers";
import { getOrderbookOrders } from "./Orders";
import { rebuildOrderbook } from "./RebuildOrderbook";

api.register("GetOrderbookAnalytics", getOrderbookAnalytics);
api.register("GetOrderbook", getOrderbook);
api.register("GetOrderbookOrders", getOrderbookOrders);
api.register("GetOrderbookOffers", getOrderbookOffers);
api.register("RebuildOrderbook", rebuildOrderbook);
