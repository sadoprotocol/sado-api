import { api } from "../../Api";
import { createOrder } from "./CreateOrder/Method";
import { createSignablePsbt } from "./CreateSignablePsbt";
import { getOrder } from "./GetOrder";

api.register("CreateOrder", createOrder);
api.register("CreateSignablePsbt", createSignablePsbt);
api.register("GetOrder", getOrder);
