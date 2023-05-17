import debug from "debug";
import fetch from "node-fetch";

import { config } from "../Config";
import { getIPFS, IPFSOffer, IPFSOrder, setIPFS } from "../Entities/IPFS";
import { makeObjectKeyChecker } from "../Libraries/Object";

const log = debug("sado-ipfs");

const FETCH_REQUEST_DEFAULTS = {
  method: "GET",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
};

const hasValidOrderKeys = makeObjectKeyChecker(["ts", "type", "maker", "location", "signature"]);
const hasValidOfferKeys = makeObjectKeyChecker(["ts", "origin", "taker", "offer"]);

/*
 |--------------------------------------------------------------------------------
 | IPFS
 |--------------------------------------------------------------------------------
 */

export const ipfs = {
  getOrder,
  getOffer,
};

/*
 |--------------------------------------------------------------------------------
 | Service Methods
 |--------------------------------------------------------------------------------
 */

async function getOrder(cid: string): Promise<IPFSResponse<IPFSOrder>> {
  const data = await get<IPFSOrder>(cid);
  if (data === undefined) {
    return errorResponse("Order does not exist, or has been removed", { cid });
  }
  if (hasValidOrderKeys(data) === false) {
    return errorResponse("Malformed order", { cid });
  }
  data.cid = cid;
  return successResponse(data);
}

async function getOffer(cid: string): Promise<IPFSResponse<IPFSOffer>> {
  const data = await get<IPFSOffer>(cid);
  if (data === undefined) {
    return errorResponse("Offer does not exist, or has been removed", { cid });
  }
  if (hasValidOfferKeys(data) === false) {
    return errorResponse("Malformed offer", { cid });
  }
  data.cid = cid;
  return successResponse(data);
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function get<Data extends IPFSOrder | IPFSOffer>(cid: string): Promise<Data | undefined> {
  log("Fetching CID '%s'", cid);
  const document = await getIPFS(cid);
  if (document !== undefined) {
    return document as Data;
  }
  const response = await fetch(config.ipfsGateway + "/ipfs/" + cid, FETCH_REQUEST_DEFAULTS);
  if (response.status === 200) {
    const data = await response.json();
    setIPFS(data);
    return data;
  }
}

function successResponse<Data extends IPFSOrder | IPFSOffer>(data: Data): IPFSResponse<Data> {
  return data;
}

function errorResponse(error: string, data?: any): IPFSResponse<any> {
  return { error, data };
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type IPFSResponse<Data extends IPFSOrder | IPFSOffer> =
  | Data
  | {
      error: string;
      data: any;
    };
