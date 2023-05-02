/**
 * @deprecated To be deprecated once clients no longer needs the response format.
 *
 * @param item - Item to get type map for.
 *
 * @returns Type map of the item.
 */
export function getTypeMap(item: any) {
  if (item.type === "buy") {
    return { buy: true, sell: false };
  }
  return { buy: false, sell: true };
}
