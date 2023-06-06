import { api } from "../../Api";
import { createOrder } from "./CreateOrder";
import { getOrder } from "./GetOrder";
import { getPSBT } from "./GetPSBT";

api.register("order.createOrder", createOrder);
api.register("order.getPsbtSignature", getPSBT);
api.register("order.getOrder", getOrder);
