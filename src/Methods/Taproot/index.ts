import { api } from "../../Api";
import { generateMnemonic } from "./GenerateMnemonic";
import { getAccountKey } from "./GetAccountKey";
import { getAddress } from "./GetAddress";

api.register("taproot.generateMnemonic", generateMnemonic);
api.register("taproot.getAccountKey", getAccountKey);
api.register("taproot.getAddress", getAddress);
