import { api } from "../../Api";
import { createInscription } from "../SegWit/CreateInscription";
import { redeemInscription } from "./RedeemInscription";

api.register("segwit.createInscription", createInscription);
api.register("segwit.redeemInscription", redeemInscription);
