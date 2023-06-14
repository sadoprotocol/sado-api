import debug from "debug";
import FormData from "form-data";
import fetch from "node-fetch";

import { getIPFS, IPFSCollection, IPFSImage, IPFSOffer, IPFSOrder, setIPFS } from "../Collections/IPFS";
import { config } from "../Config";
import { InternalError } from "../Libraries/JsonRpc";
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
const hasValidCollectionKeys = makeObjectKeyChecker([
  "id",
  "owner",
  "name",
  "title",
  "intro",
  "description",
  "cover",
  "banner",
]);
const hasValidImageKeys = makeObjectKeyChecker(["img"]);

/*
 |--------------------------------------------------------------------------------
 | IPFS
 |--------------------------------------------------------------------------------
 */

export const ipfs = {
  uploadJson,
  getOrder,
  getOffer,
  getCollection,
  getImage,
};

/*
 |--------------------------------------------------------------------------------
 | Service Methods
 |--------------------------------------------------------------------------------
 */

async function uploadJson<T extends Record<string, unknown>>(data: T): Promise<IPFSUploadResponse> {
  const form = new FormData();
  form.append("file", JSON.stringify(data), "data.json");
  const response = await fetch(`${config.ipfsApi}/upload`, { method: "POST", body: form });
  if (response.status === 200) {
    const data = await response.json();
    if (data.success === true) {
      return {
        cid: data.rdata.address,
        gateway: data.rdata["ipfs-gateway"],
      };
    }
    throw new Error(data.message);
  }
  throw new InternalError("IPFS upload failed");
}

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

async function getCollection(cid: string): Promise<IPFSResponse<IPFSCollection>> {
  const data = await get<IPFSCollection>(cid);
  if (data === undefined) {
    return errorResponse("Collection does not exist, or has been removed", { cid });
  }
  if (hasValidCollectionKeys(data) === false) {
    return errorResponse("Malformed collection", { cid });
  }
  data.cid = cid;
  return successResponse(data);
}

async function getImage(cid: string): Promise<IPFSResponse<IPFSImage>> {
  const data = await get<IPFSImage>(cid);
  if (data === undefined) {
    return errorResponse("Image does not exist, or has been removed", { cid });
  }
  if (hasValidImageKeys(data) === false) {
    return errorResponse("Malformed image", { cid });
  }
  data.cid = cid;
  return successResponse(data);
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function get<Data extends IPFSData>(cid: string): Promise<Data | undefined> {
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

function successResponse<Data extends IPFSData>(data: Data): IPFSResponse<Data> {
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

type IPFSResponse<Data extends IPFSData> =
  | Data
  | {
      error: string;
      data: any;
    };

type IPFSData = IPFSOrder | IPFSOffer | IPFSCollection | IPFSImage;

type IPFSUploadResponse = {
  cid: string;
  gateway: string;
};
