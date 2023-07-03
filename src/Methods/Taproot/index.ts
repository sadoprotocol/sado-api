import { api } from "../../Api";
import { getBip84Account } from "./Bip84/GetBip84Account";
import { getBip84Address } from "./Bip84/GetBip84Address";
import { getBip84PrivateKey } from "./Bip84/GetBip84PrivateKey";
import { getBip84PublicKey } from "./Bip84/GetBip84PublicKey";
import { createTransaction } from "./CreateTransaction";
import { createWallet } from "./CreateWallet";

api.register("CreateWallet", createWallet);
api.register("CreateTransaction", createTransaction);
api.register("GetBip84Account", getBip84Account);
api.register("GetBip84PublicKey", getBip84PublicKey);
api.register("GetBip84PrivateKey", getBip84PrivateKey);
api.register("GetBip84Address", getBip84Address);
