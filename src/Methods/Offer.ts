import { api } from "../Api";
import { IPFSOffer } from "../Entities/IPFS";
import { BadRequestError, method, NotAcceptableError, NotFoundError } from "../JsonRpc";
import { utils } from "../Orderbook/Utilities";
import { ipfs } from "../Services/IPFS";

api.register<
  {
    cid: string;
  },
  IPFSOffer
>(
  "offer.get",
  method(async ({ cid }) => {
    const offer = await ipfs.getOffer(cid);
    if ("error" in offer) {
      throw new NotAcceptableError(offer.error, offer.data);
    }
    return offer;
  })
);

api.register<
  {
    cid: string;
  },
  {
    type: string;
    offer: any;
  }
>(
  "offer.decode",
  method(async ({ cid }) => {
    const data = await ipfs.getOffer(cid);
    if ("error" in data) {
      throw new NotFoundError();
    }
    const psbt = utils.psbt.decode(data.offer);
    if (psbt !== undefined) {
      return { type: "psbt", offer: psbt };
    }
    const tx = utils.raw.decode(data.offer);
    if (tx !== undefined) {
      return { type: "raw", offer: tx };
    }
    throw new BadRequestError();
  })
);
