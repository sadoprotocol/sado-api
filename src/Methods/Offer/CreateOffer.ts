import { Network, Psbt } from "bitcoinjs-lib";
import Schema, { array, number, string } from "computed-types";

import { BadRequestError, method } from "../../Libraries/JsonRpc";
import { IPFSOrder } from "../../Models/IPFS";
import { ipfs } from "../../Services/IPFS";
import { Lookup } from "../../Services/Lookup";
import { utils } from "../../Utilities";
import { OfferPayload } from "../../Utilities/Offer/OfferPayload";
import { PsbtJSON } from "../../Utilities/PSBT";
import { validate } from "../../Validators";

export const createOffer = method({
  params: Schema({
    network: validate.schema.network,
    ts: number,
    origin: string,
    offer: string,
    taker: string,
    orderbooks: array.of(string).optional(),
    fees: Schema({
      network: number,
      rate: number,
    }),
  }),
  handler: async (params) => {
    const lookup = new Lookup(params.network);
    const network = utils.bitcoin.getBitcoinNetwork(params.network);

    // ### Offer
    // Decode the offer from base64 to use for validation.

    const offer = Psbt.fromBase64(params.offer, { network });

    // ### Order
    // Retrieve and validate the order that the offer is being made against.

    const order = await ipfs.getOrder(params.origin);
    if ("error" in order) {
      throw new BadRequestError(order.error, order.data);
    }

    validateOffer(utils.psbt.toJSON(offer, network), order);

    // ### Store Offer

    const { cid } = await ipfs.uploadJson<OfferPayload>({
      ts: params.ts,
      origin: params.origin,
      offer: offer.toBase64(),
      taker: params.taker,
    });

    // ### Create PSBT
    // Create a PSBT that relays the order to the network. This stores the order
    // reference on the blockchain and can be processed by the API.

    const psbt = await utils.offer.create(
      cid,
      {
        network,
        maker: order.maker,
        taker: params.taker,
        orderbooks: params.orderbooks ?? [],
        usedUtxos: getNonSpendableTxids(offer, network),
        fees: params.fees,
      },
      lookup
    );

    return { cid, psbt: psbt.toBase64() };
  },
});

function validateOffer(offer: PsbtJSON, order: IPFSOrder): void {
  if (offer.inputs[0].location !== order.location) {
    throw new BadRequestError("Offer input[0] does not point to location defined in the order");
  }
  const hasPayment = offer.outputs.find((output) => output.address === order.maker && output.value >= order.cardinals);
  if (hasPayment === undefined) {
    throw new BadRequestError("Offer does not contain payment to the order maker");
  }
}

function getNonSpendableTxids(psbt: Psbt, network: Network): string[] {
  return utils.psbt.toJSON(psbt, network).inputs.map((input) => input.txid);
}
