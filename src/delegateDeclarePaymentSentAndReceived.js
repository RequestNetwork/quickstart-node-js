const waitForConfirmation = async (dataOrPromise) => {
  const data = await dataOrPromise;
  return new Promise((resolve, reject) => {
    data.on("confirmed", resolve);
    data.on("error", reject);
  });
};

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

  const payeeDelegateEpkSignatureProvider =
    new EthereumPrivateKeySignatureProvider({
      method: Types.Signature.METHOD.ECDSA,
      privateKey: process.env.PAYEE_DELEGATE_PRIVATE_KEY, // Must include 0x prefix
    });

  const payerDelegateEpkSignatureProvider =
    new EthereumPrivateKeySignatureProvider({
      method: Types.Signature.METHOD.ECDSA,
      privateKey: process.env.PAYER_DELEGATE_PRIVATE_KEY, // Must include 0x prefix
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

  const payeeDelegateRequestClient = new RequestNetwork({
    nodeConnectionConfig: {
      baseURL: "https://sepolia.gateway.request.network/",
    },
    signatureProvider: payeeDelegateEpkSignatureProvider,
  });

  const payerDelegateRequestClient = new RequestNetwork({
    nodeConnectionConfig: {
      baseURL: "https://sepolia.gateway.request.network/",
    },
    signatureProvider: payerDelegateEpkSignatureProvider,
  });

  const payeeIdentityAddress = new Wallet(process.env.PAYEE_PRIVATE_KEY)
    .address;
  const payerIdentityAddress = new Wallet(process.env.PAYER_PRIVATE_KEY)
    .address;
  const payeeDelegateIdentityAddress = new Wallet(
    process.env.PAYEE_DELEGATE_PRIVATE_KEY,
  ).address;
  const payerDelegateIdentityAddress = new Wallet(
    process.env.PAYER_DELEGATE_PRIVATE_KEY,
  ).address;

  const payeeIdentity = {
    type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
    value: payeeIdentityAddress,
  };

  const payerIdentity = {
    type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
    value: payerIdentityAddress,
  };

  const payeeDelegateIdentity = {
    type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
    value: payeeDelegateIdentityAddress,
  };

  const payerDelegateIdentity = {
    type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
    value: payerDelegateIdentityAddress,
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

  const payeeRequestDataAfterDelegate =
    await payeeRequest.addDeclarativeDelegate(
      payeeDelegateIdentity,
      payeeIdentity,
    );
  console.log(
    "payeeRequestDataAfterDelegate: " +
      JSON.stringify(payeeRequestDataAfterDelegate, null, 2),
  );

  const payeeRequestDataAfterDelegateConfirmed = await waitForConfirmation(
    payeeRequestDataAfterDelegate,
  );
  console.log(
    "payeeRequestDataAfterDelegateConfirmed: " +
      JSON.stringify(payeeRequestDataAfterDelegateConfirmed, null, 2),
  );
  console.log(
    "Observe that extensions.pn-erc20-fee-proxy-contract.values.payeeDelegate is set to the payee delegate identity",
  );

  const payerRequest = await payerRequestClient.fromRequestId(
    payeeRequestData.requestId,
  );

  const payerRequestDataAfterDelegate =
    await payerRequest.addDeclarativeDelegate(
      payerDelegateIdentity,
      payerIdentity,
    );
  console.log(
    "payerRequestDataAfterDelegate: " +
      JSON.stringify(payerRequestDataAfterDelegate, null, 2),
  );

  const payerRequestDataAfterDelegateConfirmed = await waitForConfirmation(
    payerRequestDataAfterDelegate,
  );
  console.log(
    "payerRequestDataAfterDelegateConfirmed: " +
      JSON.stringify(payerRequestDataAfterDelegateConfirmed, null, 2),
  );
  console.log(
    "Observe that extensions.pn-erc20-fee-proxy-contract.values.payerDelegate is set to the payer delegate identity",
  );

  const payerDelegateRequest = await payerDelegateRequestClient.fromRequestId(
    payeeRequestData.requestId,
  );

  const payerDelegateRequestData = payerDelegateRequest.getData();

  const payerDelegateRequestDataAfterSent =
    await payerDelegateRequest.declareSentPayment(
      payerDelegateRequestData.expectedAmount,
      "payment initiated from the bank",
      payerDelegateIdentity,
    );
  console.log(
    "payerDelegateRequestDataAfterSent: " +
      JSON.stringify(payerDelegateRequestDataAfterSent, null, 2),
  );

  const payerDelegateRequestDataAfterSentConfirmed = await waitForConfirmation(
    payerDelegateRequestDataAfterSent,
  );
  console.log(
    "payerDelegateRequestDataAfterSentConfirmed: " +
      JSON.stringify(payerDelegateRequestDataAfterSentConfirmed, null, 2),
  );
  console.log(
    "Observe extensionsData contains 5 events: paymentNetwork 'create', contentData 'create', paymentNetwork 'addDelegate' x2, and paymentNetwork 'declareSentPayment'",
  );

  const payeeDelegateRequest = await payeeDelegateRequestClient.fromRequestId(
    payeeRequestData.requestId,
  );

  const payeeDelegateRequestData = payeeDelegateRequest.getData();

  const payeeDelegateRequestDataAfterReceived =
    await payeeDelegateRequest.declareReceivedPayment(
      payeeDelegateRequestData.expectedAmount,
      "payment received from the bank",
      payeeDelegateIdentity,
    );

  const payeeDelegateRequestDataAfterReceivedConfirmed =
    await waitForConfirmation(payeeDelegateRequestDataAfterReceived);
  console.log(
    "payeeDelegateRequestDataAfterReceivedConfirmed: " +
      JSON.stringify(payeeDelegateRequestDataAfterReceivedConfirmed, null, 2),
  );
  console.log(
    "Observe extensionsData contains 6 events: paymentNetwork 'create', contentData 'create', paymentNetwork 'addDelegate' x2, paymentNetwork 'declareSentPayment', and paymentNetwork 'declareReceivedPayment'",
  );

  console.log(
    "Request balance: " +
      payeeDelegateRequestDataAfterReceivedConfirmed.balance.balance,
  );
  console.log(
    `Observe that the balance is ${requestCreateParameters.requestInfo.expectedAmount}`,
  );
  console.log(
    "Request balance events: " +
      JSON.stringify(
        payeeDelegateRequestDataAfterReceivedConfirmed.balance.events,
        null,
        2,
      ),
  );
  console.log(
    `Observe that the balance event note is "payment received from the bank"`,
  );
})();
