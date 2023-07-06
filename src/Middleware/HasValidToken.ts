import { Action, UnauthorizedError } from "@valkyr/api";

import { config } from "../Config";

export const hasValidToken: Action = async (ctx, res) => {
  const authorization = ctx.headers?.authorization;
  if (authorization === undefined || authorization !== `Bearer ${config.token}`) {
    return res.reject(new UnauthorizedError());
  }
  return res.accept();
};
