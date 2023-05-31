import { Lookup } from "../Services/Lookup";

export const utxo = {
  getSpentState,
};

async function getSpentState(
  txid: string,
  n: number,
  lookup: Lookup
): Promise<{
  address: string;
  spent: boolean;
}> {
  const tx = await lookup.getTransaction(txid);
  if (tx === undefined) {
    throw new Error(`Transaction ${txid} not found.`);
  }
  const vout = tx.vout[n];
  if (vout === undefined) {
    throw new Error(`Vout ${txid}.vout[${n}] not found.`);
  }
  const address = vout.scriptPubKey.address;
  const txs = await lookup.getUnspents(address);
  for (const tx of txs) {
    if (tx.txid === txid) {
      return { address, spent: false };
    }
  }
  return { address, spent: true };
}
