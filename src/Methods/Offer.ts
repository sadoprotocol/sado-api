import { api } from "../Api";
import { BadRequestError, method } from "../JsonRpc";
import { utils } from "../Orderbook/Utilities";

api.register<
  {
    offer: string;
  },
  {
    type: string;
    offer: any;
  }
>(
  "DecodeOffer",
  method(async ({ offer }) => {
    const psbt = utils.psbt.decode(offer);
    if (psbt !== undefined) {
      return { type: "psbt", offer: psbt };
    }
    const tx = utils.raw.decode(offer);
    if (tx !== undefined) {
      return { type: "raw", offer: tx };
    }
    throw new BadRequestError();
  })
);
