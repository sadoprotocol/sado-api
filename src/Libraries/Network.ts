export const DEFAULT_NETWORK: Network = "regtest";

export const VALID_NETWORK = ["mainnet", "testnet", "regtest"] as const;

export type Network = "mainnet" | "testnet" | "regtest";
