import type { Offer, Order } from "../services/infura";
import type { Inscription, Ordinal } from "../services/lookup";

export type OrderBookOrder = OrderBookStatus & Order & OrderBookResponse;

export type OrderBookOffer = OrderBookStatus & Offer & OrderBookResponse;

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

type OrderBookStatus = {
  status: "pending" | "completed" | "rejected";
};

type OrderBookResponse = {
  ordinals: Ordinal[];
  inscriptions: Inscription[];
};

// ---

export type ItemStatus =
  | {
      status: "pending" | "completed";
    }
  | ItemRejectedStatus;

export type ItemRejectedStatus = {
  status: "rejected";
  reason: {
    code: string;
    message: string;
    data?: any;
  };
};

export type ItemContent = {
  ordinals?: Ordinal[];
  inscriptions?: Inscription[];
};
