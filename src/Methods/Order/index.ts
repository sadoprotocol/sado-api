import { api } from "../../Api";
import { getOrder } from "./GetOrder";

api.register("order.get", getOrder);
