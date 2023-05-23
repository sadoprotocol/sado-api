import Schema from "computed-types";

export const validator = {
  network: Schema.either("mainnet" as const, "testnet" as const, "regtest" as const),
  ipfs: {
    type: Schema.either("sell" as const, "buy" as const),
    status: Schema.either("pending" as const, "rejected" as const, "completed" as const),
  },
};
