import { api } from "../../Api";
import { createTaprootAddress } from "./CreateTaprootAddress";
import { recoverTaprootAddress } from "./RecoverTaprootAddress";

api.register("taproot.getAddress", createTaprootAddress);
api.register("taproot.recoverAddress", recoverTaprootAddress);
