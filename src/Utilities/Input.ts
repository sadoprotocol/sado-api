export const input = {
  getPubKeyFromFinalScriptWitness,
};

function getPubKeyFromFinalScriptWitness(hex: string): string {
  const signatureLength = parseInt(hex.slice(2, 4), 16) * 2 + 6;
  const publicKeyLength = parseInt(hex.slice(signatureLength + 2, signatureLength + 4), 16) * 2 + 2;
  return hex.slice(signatureLength, signatureLength + publicKeyLength);
}
