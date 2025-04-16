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
  const pLimit = (await import("p-limit")).default; // Use dynamic import for ESM module
  const cliProgress = require("cli-progress");

  // --- Configuration ---
  const TOTAL_REQUESTS = 100; // Total number of requests to create
  const CONCURRENCY_LIMIT = 10; // Number of requests to create concurrently
  // ---------------------

  // Load environment variables from .env file
  config();

  if (!process.env.PAYEE_PRIVATE_KEY) {
    console.error("Error: PAYEE_PRIVATE_KEY is not defined in the .env file.");
    process.exit(1);
  }

  let aborted = false;
  let successfulRequests = 0;
  let failedRequests = 0;

  // Setup Abort Handling (Ctrl+C)
  process.on("SIGINT", () => {
    console.log("\nAborting request creation...");
    aborted = true;
  });

  // Setup Progress Bar
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );

  try {
    const epkSignatureProvider = new EthereumPrivateKeySignatureProvider({
      method: Types.Signature.METHOD.ECDSA,
      privateKey: process.env.PAYEE_PRIVATE_KEY, // Must include 0x prefix
    });

    const requestClient = new RequestNetwork({
      nodeConnectionConfig: {
        baseURL: "http://localhost:3000/",
      },
      signatureProvider: epkSignatureProvider,
    });

    // In this example, the payee is also the payer and payment recipient.
    const payeeIdentity = new Wallet(process.env.PAYEE_PRIVATE_KEY).address;
    const payerIdentity = payeeIdentity;
    const paymentRecipient = payeeIdentity;
    const feeRecipient = "0x0000000000000000000000000000000000000000";

    const limit = pLimit(CONCURRENCY_LIMIT);
    const creationPromises = [];

    console.log(
      `Attempting to create ${TOTAL_REQUESTS} requests with concurrency ${CONCURRENCY_LIMIT}...`,
    );
    progressBar.start(TOTAL_REQUESTS, 0);

    for (let i = 0; i < TOTAL_REQUESTS; i++) {
      if (aborted) {
        console.log(`Skipping remaining requests due to abort signal.`);
        break; // Stop adding new tasks if aborted
      }

      creationPromises.push(
        limit(async () => {
          // Double-check abort flag before starting the async operation
          if (aborted) {
            return;
          }

          try {
            // Use a unique identifier or timestamp if content needs variation
            const uniqueContent = `Request #${i + 1} - ${Date.now()}`;

            const requestCreateParameters = {
              requestInfo: {
                currency: {
                  type: Types.RequestLogic.CURRENCY.ERC20,
                  value: "0x370DE27fdb7D1Ff1e1BaA7D11c5820a324Cf623C",
                  network: "sepolia",
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
                  paymentNetworkName: "sepolia",
                  paymentAddress: paymentRecipient,
                  feeAddress: feeRecipient,
                  feeAmount: "0",
                },
              },
              contentData: {
                reason: `🍕 - ${uniqueContent}`,
                dueDate: "2023.06.16",
              },
              signer: {
                type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
                value: payeeIdentity,
              },
            };

            const request = await requestClient.createRequest(
              requestCreateParameters,
            );
            const requestData = await request.waitForConfirmation();
            successfulRequests++;
          } catch (error) {
            console.error(
              `\nFailed to create request: ${error.message || error}`,
            );
            failedRequests++;
          } finally {
            // Ensure progress bar updates even if aborted after starting the task
            if (!aborted) {
              progressBar.increment();
            }
          }
        }),
      );
    }

    // Wait for all queued promises to settle
    await Promise.all(creationPromises);
  } catch (error) {
    console.error(`\nAn unexpected error occurred: ${error.message || error}`);
    aborted = true; // Stop progress bar on unexpected errors
  } finally {
    progressBar.stop();
    console.log("\n--- Request Creation Summary ---");
    console.log(`Total attempted: ${successfulRequests + failedRequests}`);
    console.log(`Successful: ${successfulRequests}`);
    console.log(`Failed: ${failedRequests}`);
    if (aborted && successfulRequests + failedRequests < TOTAL_REQUESTS) {
      console.log(
        `Process aborted. ${
          TOTAL_REQUESTS - (successfulRequests + failedRequests)
        } requests were not attempted.`,
      );
    }
    console.log("------------------------------");
  }
})();
