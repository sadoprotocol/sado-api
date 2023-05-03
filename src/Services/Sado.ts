import { Network } from "../Libraries/Network";
import { OrderBook } from "../Orderbook/Orderbook";

/*
 |--------------------------------------------------------------------------------
 | Service
 |--------------------------------------------------------------------------------
 */

export const sado = {
  resolve: resolveOrderbook,
  fetch: fetchOrderbook,
  delete: deleteOrderbook,
};

/*
 |--------------------------------------------------------------------------------
 | Service Methods
 |--------------------------------------------------------------------------------
 */

async function resolveOrderbook(address: string, network: Network): Promise<void> {
  const orderbook = new OrderBook(address, { network });
  await orderbook.resolve();
}

async function fetchOrderbook(address: string, network: Network): Promise<any> {
  const orderbook = new OrderBook(address, { network });
  return orderbook.fetch();
}

async function deleteOrderbook(address: string, network: Network): Promise<void> {
  const orderbook = new OrderBook(address, { network });
  await orderbook.delete();
}
