(async () => {
  const {
    RequestNetwork,
    Types,
  } = require("@requestnetwork/request-client.js");
  const requestClient = new RequestNetwork({
    nodeConnectionConfig: {
      baseURL: "https://sepolia.gateway.request.network/",
    },
  });

  const identity = "0x519145B771a6e450461af89980e5C17Ff6Fd8A92";
  const requests = await requestClient.fromIdentity({
    type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
    value: identity,
  });
  const requestDatas = requests.map((request) => request.getData());
  console.log(JSON.stringify(requestDatas));
})();
