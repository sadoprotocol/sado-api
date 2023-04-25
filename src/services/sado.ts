import { DEFAULT_NETWORK, Network } from "../libraries/network";
import { OrderBook } from "../orderbook/orderbook";

/*
 |--------------------------------------------------------------------------------
 | Service
 |--------------------------------------------------------------------------------
 */

export const sado = {
  get,
};

/*
 |--------------------------------------------------------------------------------
 | Service Methods
 |--------------------------------------------------------------------------------
 */

async function get(address: string, network: Network = DEFAULT_NETWORK): Promise<any> {
  const orderbook = new OrderBook(address, { network });
  await orderbook.resolve();
  return orderbook.toJSON();
}
