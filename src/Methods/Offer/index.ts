import { api } from "../../Api";
import { createOffer } from "./CreateOffer";
import { createOfferPsbt } from "./CreateOfferPsbt";
import { decodeOffer } from "./DecodeOffer";
import { getOffer } from "./GetOffer";

api.register("CreateOffer", createOffer);
api.register("CreateOfferPsbt", createOfferPsbt);
api.register("GetOffer", getOffer);
api.register("DecodeOffer", decodeOffer);
