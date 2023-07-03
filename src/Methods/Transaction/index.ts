import { api } from "../../Api";
import { createTransactionPsbt } from "./CreateTransactionPsbt";

api.register("CreateTransactionPsbt", createTransactionPsbt);
