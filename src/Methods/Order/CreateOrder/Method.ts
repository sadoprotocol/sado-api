import { BadRequestError, method, NotFoundError } from "@valkyr/api";

import { Lookup } from "../../../Services/Lookup";
import { utils } from "../../../Utilities";
import { order } from "../../../Utilities/Order";
import { validate } from "../../../Validators";
import { createOrderPsbt } from "./CreateOrderPsbt";
import { params } from "./Params";
import { uploadOrder } from "./UploadOrder";

export const createOrder = method({
  params,
  handler: async (params) => {
    const lookup = new Lookup(params.network);

    // ### Maker
    // Get maker details from the bitcoin address.

    const makerAddressType = utils.bitcoin.getAddressType(params.order.maker);
    if (makerAddressType === undefined) {
      throw new BadRequestError("Provided maker address does not match supported address types");
    }

    // ### Validate Location
    // Ensure that the UTXO being spent exists and is confirmed.

    await validateLocation(params.order.location, lookup);

    // ### Validate Signature
    // Make sure that the order is verifiable by the API when it is received.

    switch (params.signature.format) {
      case "psbt": {
        validate.order.signature.psbt(params.signature.value, params.order.location, lookup.btcnetwork);
        break;
      }
      case "ordit": {
        if (params.signature.pubkey === undefined) {
          throw new BadRequestError("Signature format 'ordit' requires a public key");
        }
        validate.order.signature.ordit(
          order.toHex(params.order),
          params.signature.pubkey,
          params.signature.value,
          lookup.btcnetwork
        );
        break;
      }
      case "sliced": {
        if (params.signature.pubkey === undefined) {
          throw new BadRequestError("Signature format 'sliced' requires a public key");
        }
        validate.order.signature.ordit(
          order.toHex(params.order),
          `03${params.signature.pubkey}`,
          params.signature.value,
          lookup.btcnetwork
        );
        break;
      }
      case "core": {
        validate.order.signature.core(order.toHex(params.order), params.order.maker, params.signature.value);
        break;
      }
      default: {
        throw new BadRequestError(`Signature format ${params.signature.format} is not supported`);
      }
    }

    // ### Store Order

    const cid = await uploadOrder(params);

    // ### Create PSBT
    // Create a PSBT that relays the order to the network. This stores the order
    // reference on the blockchain and can be processed by the API.

    const psbt = await createOrderPsbt(cid, params, lookup);

    return { cid, psbt: psbt.toBase64() };
  },
});

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function validateLocation(location: string, lookup: Lookup): Promise<void> {
  const [txid, index] = utils.parse.location(location);
  const transaction = await lookup.getTransaction(txid);
  if (transaction === undefined) {
    throw new NotFoundError("Location transaction does not exist, or is not yet confirmed");
  }
  const vout = transaction.vout[index];
  if (vout === undefined) {
    throw new NotFoundError("Location transaction output does not exist");
  }
}
