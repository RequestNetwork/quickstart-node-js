import { sendToHinkalShieldedAddressFromPublic } from "@requestnetwork/payment-processor";
import { providers } from "ethers";

(async () => {
  const RPC_URL = "https://mainnet.base.org";
  const provider = new providers.JsonRpcProvider(RPC_URL);
  const paymentSender = wallet.createRandom(provider);
  const paymentRecipientShieldedAddress =
    "142590100039484718476239190022599206250779986428210948946438848754146776167,0x096d6d5d8b2292aa52e57123a58fc4d5f3d66171acd895f22ce1a5b16ac51b9e,0xc025ccc6ef46399da52763a866a3a10d2eade509af27eb8411c5d251eb8cd34d";
  await sendToHinkalShieldedAddressFromPublic({
    signerOrProvider: paymentSender,
    tokenAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC on Base
    amount: "1000000", // 1 USDC
    recipientInfo: paymentRecipientShieldedAddress,
  });
})();
