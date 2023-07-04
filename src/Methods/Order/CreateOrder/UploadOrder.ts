import type { IPFSOrder } from "../../../Models/IPFS";
import { ipfs } from "../../../Services/IPFS";
import type { Params } from "./Params";

export async function uploadOrder(params: Params): Promise<string> {
  const { cid } = await ipfs.uploadJson<Omit<IPFSOrder, "cid">>({
    ts: params.order.ts,
    type: params.order.type,
    location: params.order.location,
    cardinals: params.order.cardinals,
    maker: params.order.maker,
    expiry: params.order.expiry,
    satoshi: params.order.satoshi,
    meta: params.order.meta,
    signature: params.signature.value,
    signature_format: params.signature.format,
    desc: params.signature.desc,
  });
  return cid;
}
