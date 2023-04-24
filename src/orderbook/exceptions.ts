class SadoException {
  constructor(readonly code: string, readonly message: string, readonly data: any = {}) {}
}

export class InfuraException extends SadoException {
  constructor(message: string, data: any = {}) {
    super("INFURA_REQUEST_FAILED", message, data);
  }
}

export class InvalidOwnerLocationException extends SadoException {
  constructor(location: string) {
    super("INVALID_OWNER_LOCATION", `Location does not point to a valid owner`, { location });
  }
}

export class TransactionNotFoundException extends SadoException {
  constructor(txid: string) {
    super("TRANSACTION_NOT_FOUND", `Transaction does not exist`, { txid });
  }
}

export class VoutOutOfRangeException extends SadoException {
  constructor(voutN: number) {
    super("VOUT_OUT_OF_RANGE", `Vout is out of range`, { voutN });
  }
}

export class ContentMissingException extends SadoException {
  constructor() {
    super("CONTENT_MISSING", `Missing ordinals and/or inscriptions`);
  }
}

export class OriginNotFoundException extends SadoException {
  constructor(origin: string) {
    super("ORIGIN_NOT_FOUND", `Origin does not exist`, { origin });
  }
}

export class InvalidSignatureException extends SadoException {
  constructor() {
    super("INVALID_SIGNATURE", `Invalid signature`);
  }
}

export class InvalidOrderMakerException extends SadoException {
  constructor(type: "sell" | "buy", owner: string, maker: string) {
    super("INVALID_ORDER_MAKER", `Maker associated with the '${type}' order is invalid`, { owner, maker });
  }
}

export class InvalidOfferOwnerException extends SadoException {
  constructor(owner: string, maker: string, taker: string) {
    super("INVALID_OFFER_OWNER", `No valid owner was found on the maker or taker of the offer`, {
      owner,
      maker,
      taker,
    });
  }
}
