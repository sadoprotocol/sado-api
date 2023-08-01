import { method } from "@valkyr/api";

import { utils } from "../../Utilities";
import { orderSchema } from "../../Utilities/Order/OrderPayload";

export const createSignableMessage = method({
  params: orderSchema,
  handler: async (order) => {
    return utils.order.toHex(order);
  },
});
