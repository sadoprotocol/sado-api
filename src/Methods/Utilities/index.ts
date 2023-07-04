import { api } from "../../Api";
import { psbtToBase64 } from "./psbtToBase64";
import { runTests } from "./RunTests";

api.register("PsbtToBase64", psbtToBase64);
api.register("RunTests", runTests);
