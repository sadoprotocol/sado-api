import { api } from "../../Api";
import { createSellOrder } from "./CreateSellOrder";
import { getOrder } from "./GetOrder";
import { getPSBT } from "./GetPSBT";

api.register("order.get", getOrder);
api.register("order.sell", createSellOrder);
api.register("order.psbt", getPSBT);
