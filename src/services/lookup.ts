import fetch, { RequestInit } from "node-fetch";

const endpoint = process.env.LOOKUP_ENDPOINT;

export const lookup = {
  transactions,
  transaction,
  balance,
  unspents,
};

/*
 |--------------------------------------------------------------------------------
 | Service Methods
 |--------------------------------------------------------------------------------
 */

async function transactions(address: string) {
  return await get("/transactions", { address });
}

async function transaction(txid: string) {
  return await get("/transaction", { txid });
}

async function balance(address: string) {
  return await get("/balance", { address });
}

async function unspents(address: string) {
  return await get("/unspents", { address });
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function get(path: string, data: unknown): Promise<any> {
  if (path.indexOf("/") !== 0) {
    path = "/" + path;
  }

  const url = endpoint + path;
  const requestObject: RequestInit = {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };

  if (data) {
    requestObject.body = JSON.stringify(data);
    requestObject.method = "POST";
  }

  return fetch(url, requestObject)
    .then((response) => response.json())
    .then((response: any) => {
      if (response.success && response.rdata) {
        return response.rdata;
      }
      return false;
    });
}
