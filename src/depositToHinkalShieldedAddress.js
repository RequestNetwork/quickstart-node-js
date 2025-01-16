import { sendToHinkalShieldedAddressFromPublic } from "@requestnetwork/payment-processor";
import { providers, Wallet } from "ethers";

// This function is required to wait for the indexing of shielded balance changes in Hinkal
const waitLittle = (time = 15) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve(1);
    }, time * 1000);
  });

(async () => {
  const RPC_URL = process.env.RPC_URL || "https://mainnet.base.org"; // Base RPC URL
  const provider = new providers.JsonRpcProvider(RPC_URL);
  try {
    await provider.getNetwork(); // Verify provider connection
    const senderPrivateKey = process.env.SENDER_PRIVATE_KEY;
    if (!senderPrivateKey) {
      throw new Error("SENDER_PRIVATE_KEY environment variable is required");
    }
    const paymentSender = new Wallet(process.env.SENDER_PRIVATE_KEY, provider);
  } catch (error) {
    console.error("Failed to initialize provider or sender wallet: ", error);
    process.exit(1);
  }
  const tokenAddress =
    process.env.TOKEN_ADDRESS || "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"; // USDC on Base

  if (!ethers.utils.isAddress(tokenAddress)) {
    console.error("Invalid token address: ", tokenAddress);
    process.exit(1);
  }

  const amount = process.env.DEPOSIT_AMOUNT || "1000000"; // 1 USDC

  if (!amount.match(/^\d+$/)) {
    console.error("Invalid amount: ", amount);
    process.exit(1);
  }

  // Hinkal shielded addresses must be shared out-of-band.
  // The RN SDK doesn't offer functions for sharing Hinkal shielded addresses.
  const paymentRecipientShieldedAddress =
    "142590100039484718476239190022599206250779986428210948946438848754146776167,0x096d6d5d8b2292aa52e57123a58fc4d5f3d66171acd895f22ce1a5b16ac51b9e,0xc025ccc6ef46399da52763a866a3a10d2eade509af27eb8411c5d251eb8cd34d";
  try {
    const tx = await sendToHinkalShieldedAddressFromPublic({
      signerOrProvider: paymentSender,
      tokenAddress,
      amount,
      recipientInfo: paymentRecipientShieldedAddress,
    });
    const txReceipt = await tx.wait(2);
    console.log("Transaction receipt: ", txReceipt);
    await waitLittle(7);
  } catch (error) {
    console.error("Payment failed: ", error);
    process.exit(1);
  }
})();
