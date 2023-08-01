import type { IPFSOrder } from "../../../Models/IPFS";
import { ipfs } from "../../../Services/IPFS";
import type { Params } from "./Params";

export async function uploadOrder(params: Params): Promise<string> {
  const { cid } = await ipfs.uploadJson<Omit<IPFSOrder, "cid">>({
    ts: params.order.ts,
    type: params.order.type,
    location: params.order.location,
    maker: params.order.maker,
    cardinals: params.order.cardinals,
    instant: params.order.instant,
    expiry: params.order.expiry,
    satoshi: params.order.satoshi,
    meta: params.order.meta,
    signature: params.signature.value,
    signature_format: params.signature.format,
    desc: params.signature.desc,
    pubkey: params.signature.pubkey,
  });
  return cid;
}
