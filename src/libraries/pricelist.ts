import { btcToUsd, satToBtc } from "./bitcoin";

export class PriceList {
  constructor(public sat = 0, public btc = satToBtc(sat), public usd = btcToUsd(btc)) {}

  set(sat: number) {
    this.sat = sat;
    this.btc = satToBtc(sat);
    this.usd = btcToUsd(this.btc);
    return this;
  }

  increment(sat: number) {
    this.sat += sat;
    this.btc = satToBtc(this.sat);
    this.usd = btcToUsd(this.btc);
    return this;
  }

  decrement(sat: number) {
    this.sat -= sat;
    this.btc = satToBtc(this.sat);
    this.usd = btcToUsd(this.btc);
    return this;
  }
}
