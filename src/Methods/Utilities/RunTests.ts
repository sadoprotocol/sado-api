import { method } from "@valkyr/api";
import { bech32 } from "bech32";
import { address, networks, payments } from "bitcoinjs-lib";
import { sign, verify } from "bitcoinjs-message";

import { Wallet } from "../../Libraries/Wallet";
import { utils } from "../../Utilities";

export const runTests = method({
  handler: async () => {
    const mnemonic = await utils.taproot.generateMnemonic();
    const wallet = Wallet.fromMnemonic(mnemonic, "regtest").derive("m/84'/1'/0'/0/0");

    const taproot = payments.p2wpkh({ pubkey: wallet.publicKey, network: networks.regtest });
    const taprootAddress = taproot.address;

    const decodedAddress = bech32.decode(taprootAddress!);
    const data = Buffer.from(bech32.fromWords(decodedAddress.words.slice(0, -1)));
    const base58Address = address.toBech32(data, 0, decodedAddress.prefix);

    const message = "Hello World!";
    const signature = sign(message, wallet.privateKey!, true);

    console.log(message, signature, wallet.address);

    return {
      verified: verify(message, base58Address!, signature),
    };
  },
});
