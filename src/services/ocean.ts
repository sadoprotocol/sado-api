import fetch from "node-fetch";

import { config } from "../config";
import { redis } from "./redis";

const FETCH_REQUEST_DEFAULTS = {
  method: "GET",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
};

/*
 |--------------------------------------------------------------------------------
 | Ocean
 |--------------------------------------------------------------------------------
 */

export const ocean = {
  getDexPrices,
};

/*
 |--------------------------------------------------------------------------------
 | Service Methods
 |--------------------------------------------------------------------------------
 */

async function getDexPrices(): Promise<DexPrices | undefined> {
  const cacheKey = `ocean-dex-prices`;
  const cachedData = await redis.getData<DexPrices>({ key: cacheKey });
  if (cachedData) {
    return cachedData;
  }
  const response = await fetch(config.oceanEndpoint + "/poolpairs/dexprices?denomination=USDT", FETCH_REQUEST_DEFAULTS);
  if (response.status === 200) {
    const {
      data: { dexPrices },
    } = await response.json();
    void redis.setData({ key: cacheKey, data: dexPrices, expiration: 60 * 15 });
    return dexPrices;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type DexPrices = {
  [token: string]: {
    token: {
      id: string;
      name: string;
      symbol: string;
      displaySymbol: string;
    };
    denominationPrice: string;
  };
};
