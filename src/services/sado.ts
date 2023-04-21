import { OrderBookBuilder } from "../builders/builder";

export async function get(address: string): Promise<any> {
  const builder = new OrderBookBuilder(address);
  await builder.resolve();
  return builder.orderbook.toJSON();
}
