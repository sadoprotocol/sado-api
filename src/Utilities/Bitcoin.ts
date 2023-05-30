import * as btc from "bitcoinjs-lib";

import { Network } from "../Libraries/Network";
import { dexPrices } from "../Services/DexPrices";

export const BTC_TO_SAT = 1e8;

const addressFormats = {
  mainnet: {
    p2pkh: /^[1][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
    p2sh: /^[3][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
    bech32: /^(bc1)[a-zA-HJ-NP-Z0-9]{39,58}$/,
  },
  other: {
    p2pkh: /^[mn][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
    p2sh: /^[2][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
    bech32: /^(tb1|bcrt1)[a-zA-HJ-NP-Z0-9]{39,58}$/,
  },
} as const;

export function getBitcoinNetwork(value: Network): btc.Network {
  if (value === "mainnet") {
    return btc.networks.bitcoin;
  }
  return btc.networks[value];
}

export function getBitcoinAddress(value: string): Address | undefined {
  for (const network of Object.keys(addressFormats) as ["mainnet", "other"]) {
    if (addressFormats[network].p2pkh.test(value)) {
      return {
        address: value,
        type: "p2pkh",
      };
    }
    if (addressFormats[network].p2sh.test(value)) {
      return {
        address: value,
        type: "p2sh",
      };
    }
    if (addressFormats[network].bech32.test(value)) {
      return {
        address: value,
        type: "bech32",
      };
    }
  }
}

export function getAddressFromPubKey(
  pubkey: string,
  format: Address["type"],
  network: btc.Network
): string | undefined {
  const publicKeyBuffer = Buffer.from(pubkey, "hex");
  switch (format) {
    case "p2sh": {
      const { address } = btc.payments.p2sh({
        redeem: btc.payments.p2wpkh({ pubkey: publicKeyBuffer, network }),
        network,
      });
      return address;
    }
    case "p2pkh": {
      const { address } = btc.payments.p2pkh({ pubkey: publicKeyBuffer, network });
      return address;
    }
    case "bech32": {
      const { address } = btc.payments.p2wpkh({ pubkey: publicKeyBuffer, network });
      return address;
    }
  }
}

export function btcToSat(btc: number): number {
  return Math.floor(btc * BTC_TO_SAT);
}

export function satToBtc(sat: number): number {
  return sat / BTC_TO_SAT;
}

export function btcToUsd(btc: number): number {
  return btc * dexPrices.usd;
}

export type Address = {
  address: string;
  type: "p2pkh" | "p2sh" | "bech32";
};
