import { address, Psbt } from "bitcoinjs-lib";
import Schema, { number, string } from "computed-types";

import { BadRequestError, method, NotFoundError } from "../../Libraries/JsonRpc";
import { IPFSOrder } from "../../Models/IPFS";
import { ipfs } from "../../Services/IPFS";
import { Lookup } from "../../Services/Lookup";
import { utils } from "../../Utilities";
import { validate } from "../../Validators";

export const createOfferPsbt = method({
  params: Schema({
    network: validate.schema.network,
    cid: string,
    taker: string,
    cardinals: number,
    fees: Schema({
      network: number,
      rate: number,
    }),
  }),
  handler: async (params) => {
    const lookup = new Lookup(params.network);
    const network = utils.bitcoin.getBitcoinNetwork(params.network);

    const order = await getOrder(params.cid, params.cardinals);
    const ordinals = await getOrdinalTransaction(order.location, lookup);
    const utxos = await getSpendableUtxos(params.taker, lookup);
    const psbt = new Psbt({ network });

    // ### Transfer Ordinals
    // Add input and output for the ordinals being sold. This should go to the
    // taker address and be the first input of the transaction.

    psbt.addInput({
      hash: ordinals.txid,
      index: ordinals.index,
      witnessUtxo: {
        script: address.toOutputScript(order.maker, network),
        value: ordinals.value,
      },
    });

    psbt.addOutput({
      address: params.taker,
      value: ordinals.value,
    });

    // ### Transfer Payment
    // Add inputs and outputs for the payment being made. This should be the
    // the asking price in cardinals to the maker address. It should also
    // cover any fees incurred and provide any remaning change to the taker.

    let total = 0;
    let fee = 0;

    for (const { txid, n, value } of utxos) {
      const sats = utils.bitcoin.btcToSat(value);

      psbt.addInput({
        hash: txid,
        index: n,
        witnessUtxo: {
          script: address.toOutputScript(params.taker, network),
          value: sats,
        },
      });

      total += sats;
      fee = utils.psbt.getEstimatedFee(psbt, params.fees.rate) + params.fees.network;

      if (total - fee >= params.cardinals) {
        break;
      }
    }

    psbt.addOutput({
      address: order.maker,
      value: params.cardinals,
    });

    const change = total - params.cardinals - fee;
    if (change <= 0) {
      throw new BadRequestError("Not enough funds to cover fee");
    }

    psbt.addOutput({
      address: params.taker,
      value: change,
    });

    return { psbt: psbt.toBase64() };
  },
});

/**
 * Get order from IPFS and validate it against the incoming order parameters.
 *
 * @param cid       - IPFS CID of the order.
 * @param cardinals - Amount of cardinals offered.
 *
 * @returns resolved ipfs order.
 */
async function getOrder(cid: string, cardinals: number): Promise<IPFSOrder> {
  const order = await ipfs.getOrder(cid);
  if ("error" in order) {
    throw new BadRequestError(order.error, order.data);
  }
  if (cardinals < order.cardinals) {
    throw new BadRequestError("Offered cardinals is lower than the asking price");
  }
  return order;
}

/**
 * Get the transaction for the location provided by the IPFS order. Should validate
 * that the transaction is valid and unspent. Throw a request error if the lookup
 * or validation fails.
 *
 * @param location - Location of the transaction as defined in ipfs order.
 * @param lookup   - Lookup service to use.
 *
 * @returns transaction id, index and value of the ordinal output being sold.
 */
async function getOrdinalTransaction(
  location: string,
  lookup: Lookup
): Promise<{
  txid: string;
  index: number;
  value: number;
}> {
  const [txid, n] = utils.parse.location(location);

  const tx = await lookup.getTransaction(txid);
  if (tx === undefined) {
    throw new NotFoundError("Order transaction not found");
  }

  const vout = tx.vout[n];
  if (vout === undefined) {
    throw new NotFoundError("Order transaction output not found");
  }

  if (vout.spent !== false) {
    throw new BadRequestError("Order transaction output already spent");
  }

  return {
    txid,
    index: n,
    value: utils.bitcoin.btcToSat(vout.value),
  };
}

/**
 * Get a list of spendable utxos that can be applied to the offer psbt. Should
 * throw an error if the spendable utxos is empty.
 *
 * Spendable UTXOs are defined as UTXOs that are not spent, does not contain
 * any inscriptions or ordinals that is of rarity above 'common'.
 *
 * @param address - Address of the taker.
 * @param lookup  - Lookup service to use.
 *
 * @returns list of spendable utxos.
 */
async function getSpendableUtxos(address: string, lookup: Lookup) {
  const utxos = await utils.transaction.getSpendableUtxos(address, [], lookup);
  if (utxos.length === 0) {
    throw new BadRequestError("Provided taker does not have sufficient funds to cover offer");
  }
  return utxos;
}
