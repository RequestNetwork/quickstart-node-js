const waitForConfirmation = async (dataOrPromise) => {
  const data = await dataOrPromise;
  return new Promise((resolve, reject) => {
    data.on("confirmed", resolve);
    data.on("error", reject);
  });
};

process.on("uncaughtException", (err) => {
  console.error(err);
  process.exit(1);
});
process.on("unhandledRejection", (err) => {
  console.error(err);
  process.exit(1);
});
(async () => {
  const {
    RequestNetwork,
    Types,
    Utils,
  } = require("@requestnetwork/request-client.js");
  const {
    EthereumPrivateKeySignatureProvider,
  } = require("@requestnetwork/epk-signature");
  const { config } = require("dotenv");
  const { Wallet } = require("ethers");

  // Load environment variables from .env file
  config();

  const payeeEpkSignatureProvider = new EthereumPrivateKeySignatureProvider({
    method: Types.Signature.METHOD.ECDSA,
    privateKey: process.env.PAYEE_PRIVATE_KEY, // Must include 0x prefix
  });

  const payerEpkSignatureProvider = new EthereumPrivateKeySignatureProvider({
    method: Types.Signature.METHOD.ECDSA,
    privateKey: process.env.PAYER_PRIVATE_KEY, // Must include 0x prefix
  });

  const payeeRequestClient = new RequestNetwork({
    nodeConnectionConfig: {
      baseURL: "https://sepolia.gateway.request.network/",
    },
    signatureProvider: payeeEpkSignatureProvider,
  });

  const payerRequestClient = new RequestNetwork({
    nodeConnectionConfig: {
      baseURL: "https://sepolia.gateway.request.network/",
    },
    signatureProvider: payerEpkSignatureProvider,
  });

  const payeeIdentityAddress = new Wallet(process.env.PAYEE_PRIVATE_KEY)
    .address;
  const payerIdentityAddress = new Wallet(process.env.PAYER_PRIVATE_KEY)
    .address;

  const payeeIdentity = {
    type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
    value: payeeIdentityAddress,
  };

  const payerIdentity = {
    type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
    value: payerIdentityAddress,
  };

  // In this example, the payee is also the payment recipient.
  const paymentRecipient = payeeIdentityAddress;
  const feeRecipient = "0x0000000000000000000000000000000000000000";

  const requestCreateParameters = {
    requestInfo: {
      currency: {
        type: Types.RequestLogic.CURRENCY.ERC20,
        value: "0x370DE27fdb7D1Ff1e1BaA7D11c5820a324Cf623C", // FAU token address
        network: "sepolia",
      },
      expectedAmount: "1000000000000000000", // 1.0
      payee: payeeIdentity,
      payer: payerIdentity,
      timestamp: Utils.getCurrentTimestampInSecond(),
    },
    paymentNetwork: {
      // We can declare payments because ERC20 fee proxy payment network inherits from declarative payment network
      id: Types.Extension.PAYMENT_NETWORK_ID.ERC20_FEE_PROXY_CONTRACT,
      parameters: {
        paymentNetworkName: "sepolia",
        paymentAddress: paymentRecipient,
        feeAddress: feeRecipient,
        feeAmount: "0",
      },
    },
    contentData: {
      reason: "🍕",
      dueDate: "2023.06.16",
      builderId: "request-network",
      createdWith: "quickstart",
    },
    signer: payeeIdentity,
  };

  const payeeRequest = await payeeRequestClient.createRequest(
    requestCreateParameters,
  );
  const payeeRequestData = await payeeRequest.waitForConfirmation();
  // console.log("payeeRequestData: " + JSON.stringify(payeeRequestData, null, 2));

  const payerRequest = await payerRequestClient.fromRequestId(
    payeeRequestData.requestId,
  );
  const payerRequestData = payerRequest.getData();
  // console.log("payerRequestData: " + JSON.stringify(payerRequestData, null, 2));

  const payerRequestData2 = await payerRequest.declareSentPayment(
    payerRequestData.expectedAmount,
    "payment initiated from the bank",
    payerIdentity,
  );
  console.log(
    "payerRequestData2: " + JSON.stringify(payerRequestData2, null, 2),
  );

  payerRequestData2.on("confirmed", () => {
    console.log(
      "payerRequestDataAfterSent: " +
        JSON.stringify(payerRequestData2, null, 2),
    );
  });
})();
