import { api } from "../../Api";
import { decodeOffer } from "./DecodeOffer";
import { getOffer } from "./GetOffer";

api.register("offer.getOffer", getOffer);
api.register("offer.decode", decodeOffer);
