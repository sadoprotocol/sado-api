import Schema, { string } from "computed-types";

export const schema = {
  network: Schema.either("mainnet" as const, "testnet" as const, "regtest" as const).error(
    "Expected value to be 'mainnet', 'testnet' or 'regtest'"
  ),
  type: Schema.either("sell" as const, "buy" as const).error("Expected value to be 'sell' or 'buy'"),
  status: Schema.either("pending" as const, "rejected" as const, "completed" as const).error(
    "Expected value to be 'pending', 'rejected', or 'completed'"
  ),
  location: string.regexp(/^[a-f0-9]{64}:[0-9]+$/, "Expected value to be a valid utxo location in format of txid:vout"),
  bip84: {
    type: Schema.either("receive" as const, "change" as const).error("Expected value to be 'receive' or 'change'"),
  },
  signature: {
    format: Schema.either("psbt" as const, "ordit" as const, "sliced" as const, "core" as const).error(
      "Expected value to be 'psbt', 'ordit', or 'core'"
    ),
  },
};
