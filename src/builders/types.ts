import type { Offer, Order } from "../services/infura";
import type { Inscription, Ordinal } from "../services/lookup";

export type OrderBookOrder = Order & OrderBookResponse;

export type OrderBookOffer = Offer &
  OrderBookResponse & {
    order?: Order;
  };

export type OrderBookReject = {
  type: "order" | "offer";
  code: string;
  message: string;
  reject: Order | Offer | OrderBookOrder | OrderBookOffer | string;
};

type OrderBookResponse = {
  ordinals: Ordinal[];
  inscriptions: Inscription[];
};
