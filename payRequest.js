(async () => {
  const {
    RequestNetwork,
    Types,
    Utils,
  } = require("@requestnetwork/request-client.js");
  const {
    EthereumPrivateKeySignatureProvider,
  } = require("@requestnetwork/epk-signature");
  const {
    approveErc20,
    hasSufficientFunds,
    hasErc20Approval,
    payRequest,
  } = require("@requestnetwork/payment-processor");
  const { providers, Wallet } = require("ethers");
  const { config } = require("dotenv");
  // Load environment variables from .env file (without overriding variables already set)
  config();
  const epkSignatureProvider = new EthereumPrivateKeySignatureProvider({
    method: Types.Signature.METHOD.ECDSA,
    privateKey: process.env.PAYEE_PRIVATE_KEY, // Must include 0x prefix
  });
  const requestClient = new RequestNetwork({
    nodeConnectionConfig: {
      baseURL: "https://goerli.gateway.request.network/",
    },
    signatureProvider: epkSignatureProvider,
  });
  const payeeIdentity = "0x7eB023BFbAeE228de6DC5B92D0BeEB1eDb1Fd567";
  const payerIdentity = payeeIdentity;
  const paymentRecipient = payeeIdentity;
  const feeRecipient = "0x0000000000000000000000000000000000000000";
  const request = await requestClient.createRequest({
    requestInfo: {
      currency: {
        type: Types.RequestLogic.CURRENCY.ERC20,
        value: "0xBA62BCfcAaFc6622853cca2BE6Ac7d845BC0f2Dc",
        network: "goerli",
      },
      expectedAmount: "1000000000000000000",
      payee: {
        type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
        value: payeeIdentity,
      },
      payer: {
        type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
        value: payerIdentity,
      },
      timestamp: Utils.getCurrentTimestampInSecond(),
    },
    paymentNetwork: {
      id: Types.Extension.PAYMENT_NETWORK_ID.ERC20_FEE_PROXY_CONTRACT,
      parameters: {
        paymentNetworkName: "goerli",
        paymentAddress: paymentRecipient,
        feeAddress: feeRecipient,
        feeAmount: "0",
      },
    },
    contentData: {
      reason: "🍕",
      dueDate: "2023.06.16",
    },
    signer: {
      type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
      value: payeeIdentity,
    },
  });
  let requestData = await request.waitForConfirmation();
  console.log(`Created Request: ${JSON.stringify(requestData)}`);
  const provider = new providers.JsonRpcProvider(
    process.env.JSON_RPC_PROVIDER_URL,
  );
  const payerWallet = new Wallet(
    `0x${process.env.PAYER_PRIVATE_KEY}`,
    provider,
  );
  console.log(
    `Checking if payer ${payerWallet.address} has sufficient funds...`,
  );
  const _hasSufficientFunds = await hasSufficientFunds(
    requestData,
    payerWallet.address,
    {
      provider: provider,
    },
  );
  console.log(`_hasSufficientFunds = ${_hasSufficientFunds}`);
  if (!_hasSufficientFunds) {
    throw new Error(`Insufficient Funds: ${payerWallet.address}`);
  }
  console.log(
    `Checking if payer ${payerWallet.address} has sufficient approval...`,
  );
  const _hasErc20Approval = await hasErc20Approval(
    requestData,
    payerWallet.address,
    provider,
  );
  console.log(`_hasErc20Approval = ${_hasErc20Approval}`);
  if (!_hasErc20Approval) {
    console.log(`Requesting approval...`);
    const approvalTx = await approveErc20(requestData, payerWallet);
    await approvalTx.wait(2);
    console.log(`Approval granted. ${approvalTx.hash}`);
  }
  const paymentTx = await payRequest(requestData, payerWallet);
  await paymentTx.wait(2);
  console.log(`Payment complete. ${paymentTx.hash}`);
  // TODO: add timeout
  while (requestData.balance?.balance < requestData.expectedAmount) {
    requestData = await request.refresh();
    console.log(`current balance = ${requestData.balance?.balance}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
})();
