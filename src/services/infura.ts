import fetch from "node-fetch";

import { config } from "../config";

export const infura = {
  get,
};

async function get(cid: string): Promise<any> {
  return fetch(config.infuraGateway + "/ipfs/" + cid, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  }).then((response) => response.json());
}
