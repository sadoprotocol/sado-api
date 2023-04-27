import { btcToUsd, satToBtc } from "./bitcoin";

export class PriceList {
  usd = 0;

  constructor(public sat = 0, public btc = satToBtc(sat)) {}

  set(sat: number) {
    this.sat = sat;
    this.btc = satToBtc(sat);
    return this;
  }

  increment(sat: number) {
    this.sat += sat;
    this.btc = satToBtc(this.sat);
    return this;
  }

  decrement(sat: number) {
    this.sat -= sat;
    this.btc = satToBtc(this.sat);
    return this;
  }

  async setUSD() {
    this.usd = await btcToUsd(this.btc);
    return this;
  }
}
