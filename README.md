# quickstart-node.js

Make a .env file

```bash
cp .env.example .env
```

Add the environment variables:

```bash
# Must include 0x prefix
PAYEE_PRIVATE_KEY='0x4025da5692759add08f98f4b056c41c71916a671cedc7584a80d73adc7fb43c0'
PAYER_PRIVATE_KEY='0x4025da5692759add08f98f4b056c41c71916a671cedc7584a80d73adc7fb43c0'

# Infura, Alchemy, etc.
JSON_RPC_PROVIDER_URL='https://eth-goerli.g.alchemy.com/v2/demo'
```

Install

```bash
npm install
```

Run the scripts

```bash
node retrieveRequest.js
node createRequest.js
node payRequest.js
```
