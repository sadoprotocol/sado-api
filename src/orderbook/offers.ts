import { Network } from "../libraries/network";
import { Offer, OfferContext } from "./offer";

export class Offers {
  readonly list: Offer[] = [];

  constructor(readonly network: Network) {}

  /*
   |--------------------------------------------------------------------------------
   | Accessors
   |--------------------------------------------------------------------------------
   */

  get map() {
    const map: OffersMap = {};
    for (const offer of this.list) {
      map[offer.order.location] = offer;
    }
    return map;
  }

  /*
   |--------------------------------------------------------------------------------
   | Handlers
   |--------------------------------------------------------------------------------
   */

  async addOffer(cid: string, context: OfferContext): Promise<void> {
    const offer = await Offer.from(cid, context);
    if (offer === undefined) {
      return; // no offer found under this cid, reject or skip?
    }
    await offer.resolve();
    this.list.push(offer);
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type OffersMap = {
  [cid: string]: Offer;
};
