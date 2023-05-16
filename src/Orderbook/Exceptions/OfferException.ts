import { SadoException } from "./SadoException";

export class OfferIPFSOfferRejected extends SadoException {
  constructor(txid: string, cid: string) {
    super("OFFER_IPFS_OFFER_REJECTED", "IPFS offer is missing or malformed.", {
      txid,
      cid,
    });
  }
}

export class OfferIPFSOrderRejected extends SadoException {
  constructor(txid: string, cid: string) {
    super("OFFER_IPFS_ORDER_REJECTED", "IPFS order is missing or malformed.", {
      txid,
      cid,
    });
  }
}

export class OfferSignatureInvalid extends SadoException {
  constructor() {
    super("OFFER_MAKER_SIGNATURE_INVALID", "Signature was not signed by the offer maker.");
  }
}
