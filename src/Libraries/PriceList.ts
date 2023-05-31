import { utils } from "../Utilities";

export class PriceList {
  constructor(public sat = 0, public btc = utils.bitcoin.satToBtc(sat), public usd = utils.bitcoin.btcToUsd(btc)) {}

  set(sat: number) {
    this.sat = sat;
    this.btc = utils.bitcoin.satToBtc(sat);
    this.usd = utils.bitcoin.btcToUsd(this.btc);
    return this;
  }

  increment(sat: number) {
    this.sat += sat;
    this.btc = utils.bitcoin.satToBtc(this.sat);
    this.usd = utils.bitcoin.btcToUsd(this.btc);
    return this;
  }

  decrement(sat: number) {
    this.sat -= sat;
    this.btc = utils.bitcoin.satToBtc(this.sat);
    this.usd = utils.bitcoin.btcToUsd(this.btc);
    return this;
  }
}
