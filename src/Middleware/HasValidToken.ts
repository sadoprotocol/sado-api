import { config } from "../Config";
import { Action, UnauthorizedError } from "../Libraries/JsonRpc";

export const hasValidToken: Action = async (ctx, res) => {
  const authorization = ctx.headers?.authorization;
  if (authorization === undefined || authorization !== `Bearer ${config.token}`) {
    return res.reject(new UnauthorizedError());
  }
  return res.accept();
};
