import { validatePSBT } from "./PSBT";
import { validateRawTx } from "./RawTx";

export const format = {
  psbt: validatePSBT,
  raw: validateRawTx,
};
