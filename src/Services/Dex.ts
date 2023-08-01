import debug from "debug";
import fetch from "node-fetch";

const log = debug("sado-dex");

export const dex: Currency = {};

/*
 |--------------------------------------------------------------------------------
 | Dex Price Updater
 |--------------------------------------------------------------------------------
 */

setInterval(setDexPrice, 1000 * 60 * 15);

async function setDexPrice(): Promise<void> {
  const res = await fetch("https://blockchain.info/ticker");
  if (res.status !== 200) {
    return;
  }

  const data = await res.json();

  const currency: Currency = {};
  for (const key in data) {
    currency[key] = {
      value: data[key].last,
      symbol: data[key].symbol,
    };
  }

  log("USD: %d | SGD: %d | CNY: %d", currency.USD.value, currency.SGD.value, currency.CNY.value);
}

setDexPrice();

type Currency = {
  [key: string]: {
    value: number;
    symbol: string;
  };
};
