import { api } from "../../Api";
import { createPartialTransaction } from "./CreateTransaction";

api.register("transaction.create", createPartialTransaction);
