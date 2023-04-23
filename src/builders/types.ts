import type { Offer, Order } from "../services/infura";
import type { Inscription, Ordinal } from "../services/lookup";

export type OrderBookOrder = Order & OrderBookResponse;

export type OrderBookOffer = Offer & OrderBookResponse;

export type OrderBookReject = {
  code: string;
  message: string;
  data?: any;
} & (OrderBookRejectedOrder | OrderBookRejectedOffer);

export type OrderBookRejectedOrder = {
  type: "order";
  order: Order | OrderBookOrder | string;
};

export type OrderBookRejectedOffer = {
  type: "offer";
  offer: Offer | OrderBookOffer | string;
};

type OrderBookResponse = {
  ordinals: Ordinal[];
  inscriptions: Inscription[];
};
