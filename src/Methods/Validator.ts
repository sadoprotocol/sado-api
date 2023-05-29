import Schema, { string } from "computed-types";

export const validator = {
  network: Schema.either("mainnet" as const, "testnet" as const, "regtest" as const).error(
    "Expected value to be 'mainnet', 'testnet' or 'regtest'"
  ),
  ipfs: {
    type: Schema.either("sell" as const, "buy" as const).error("Expected value to be 'sell' or 'buy'"),
    status: Schema.either("pending" as const, "rejected" as const, "completed" as const).error(
      "Expected value to be 'pending', 'rejected' or 'completed'"
    ),
    location: string.regexp(
      /^[a-f0-9]{64}:[0-9]+$/,
      "Expected value to be a valid utxo location in format of txid:vout"
    ),
  },
  btc: {
    address: string.regexp(/^(1|3)[a-km-zA-HJ-NP-Z1-9]{25,34}$/).error("Expected value to be a valid bitcoin address"),
  },
};
