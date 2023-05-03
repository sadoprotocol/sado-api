import { SadoException } from "./SadoException";

export class OfferSignatureInvalid extends SadoException {
  constructor() {
    super("OFFER_MAKER_SIGNATURE_INVALID", "Signature was not signed by the offer maker.");
  }
}
