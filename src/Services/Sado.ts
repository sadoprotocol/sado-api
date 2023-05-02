import { Network } from "../Libraries/Network";
import { OrderBook } from "../Orderbook/Orderbook";

/*
 |--------------------------------------------------------------------------------
 | Service
 |--------------------------------------------------------------------------------
 */

export const sado = {
  resolve,
  get,
};

/*
 |--------------------------------------------------------------------------------
 | Service Methods
 |--------------------------------------------------------------------------------
 */

async function resolve(address: string, network: Network): Promise<void> {
  const orderbook = new OrderBook(address, { network });
  await orderbook.resolve();
}

async function get(address: string, network: Network): Promise<any> {
  const orderbook = new OrderBook(address, { network });
  return orderbook.fetch();
}
