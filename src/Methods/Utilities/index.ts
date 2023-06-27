import { api } from "../../Api";
import { psbtToBase64 } from "./psbtToBase64";

api.register("utils.psbtToBase64", psbtToBase64);
