import { api } from "../../Api";
import { createInstantBuyPsbt } from "./CreateInstantBuyPsbt";
import { createOrder } from "./CreateOrder";
import { createSignablePsbt } from "./CreateSignablePsbt";
import { getOrder } from "./GetOrder";

api.register("CreateOrder", createOrder);
api.register("CreateInstantBuyPsbt", createInstantBuyPsbt);
api.register("CreateSignablePsbt", createSignablePsbt);
api.register("GetOrder", getOrder);
