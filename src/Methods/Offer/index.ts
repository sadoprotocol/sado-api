import { api } from "../../Api";
import { createOffer } from "./CreateOffer";
import { createOfferPSBT } from "./CreateOfferPSBT";
import { decodeOffer } from "./DecodeOffer";
import { getOffer } from "./GetOffer";

api.register("offer.createOffer", createOffer);
api.register("offer.createOfferPSBT", createOfferPSBT);
api.register("offer.getOffer", getOffer);
api.register("offer.decode", decodeOffer);
