import { api } from "../../Api";
import { getBip84Account } from "./Bip84/GetBip84Account";
import { getBip84Address } from "./Bip84/GetBip84Address";
import { getBip84PrivateKey } from "./Bip84/GetBip84PrivateKey";
import { getBip84PublicKey } from "./Bip84/GetBip84PublicKey";
import { createTransaction } from "./CreateTransaction";
import { createWallet } from "./CreateWallet";

api.register("taproot.createWallet", createWallet);
api.register("taproot.createTransaction", createTransaction);
api.register("taproot.bip84.getAccount", getBip84Account);
api.register("taproot.bip84.getPublicKey", getBip84PublicKey);
api.register("taproot.bip84.getPrivateKey", getBip84PrivateKey);
api.register("taproot.bip84.getAddress", getBip84Address);
