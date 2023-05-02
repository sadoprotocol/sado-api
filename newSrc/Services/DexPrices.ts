import debug from "debug";
import fetch from "node-fetch";

import { config } from "../Config";

const log = debug("sado-dexprices");

const FETCH_REQUEST_DEFAULTS = {
  method: "GET",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
};

export const dexPrices = {
  usd: 0,
};

/*
 |--------------------------------------------------------------------------------
 | Dex Price Updater
 |--------------------------------------------------------------------------------
 */

setInterval(setDexPrice, 1000 * 60 * 15);

async function setDexPrice(): Promise<void> {
  const response = await fetch(config.oceanEndpoint + "/poolpairs/dexprices?denomination=USDT", FETCH_REQUEST_DEFAULTS);
  if (response.status === 200) {
    const { data } = await response.json();
    dexPrices.usd = data.dexPrices.BTC.denominationPrice;
    log("price set", dexPrices.usd);
  }
}

setDexPrice();
