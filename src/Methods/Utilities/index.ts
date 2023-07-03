import { api } from "../../Api";
import { psbtToBase64 } from "./psbtToBase64";

api.register("PsbtToBase64", psbtToBase64);
