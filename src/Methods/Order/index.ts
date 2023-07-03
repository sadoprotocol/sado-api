import { api } from "../../Api";
import { createOrder } from "./CreateOrder";
import { createSignablePsbt } from "./CreateSignablePsbt";
import { getOrder } from "./GetOrder";

api.register("CreateOrder", createOrder);
api.register("CreateSignablePsbt", createSignablePsbt);
api.register("GetOrder", getOrder);
