import type { TransactionType } from "../Models/Transaction";

export const parse = {
  location: parseLocation,
  orderbookListing: parseOrderbookListing,
  sado: parseSadoOutput,
};

function parseLocation(location: string): [string, number] {
  const [txid, vout] = location.split(":");
  if (txid === undefined || vout === undefined) {
    throw new Error("Invalid location");
  }
  return [txid, parseInt(vout)];
}

function parseOrderbookListing(value: string): [string, number] {
  const [address, price] = value.split(":");
  if (address === undefined) {
    throw new Error("Invalid orderbook listing");
  }
  return [address, price === undefined ? 600 : parseInt(price)];
}

function parseSadoOutput(utf8?: string):
  | {
      type: TransactionType;
      cid: string;
    }
  | undefined {
  if (utf8?.includes("sado=") === true) {
    const vs = utf8.split("=");
    const [type, cid] = vs[1].split(":");
    if (type === "order" || type === "offer" || type === "collection") {
      return { type, cid };
    }
  }
}
