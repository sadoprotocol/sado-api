import { OrderBook } from "../libraries/orderbook";

export async function get(address: string): Promise<any> {
  const orderbook = new OrderBook(address);
  await orderbook.resolve();
  return orderbook.filtered;
}
