import { api } from "../../Api";
import { getOrder } from "./GetOrder";
import { makeSellOrder } from "./MakeSellOrder";

api.register("order.get", getOrder);
api.register("order.sell", makeSellOrder);
