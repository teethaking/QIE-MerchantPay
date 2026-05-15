# QIE MerchantPay

QIE MerchantPay is a mobile-first crypto point-of-sale web app for merchants accepting QIE/QUSDC payments on QIE mainnet.

## Features

- Wallet-based onboarding with MetaMask or another injected EIP-1193 wallet.
- Merchant session storage in `localStorage`.
- Live USD/EUR to QIE conversion through the FastAPI price endpoint.
- QR payment URI generation in the format `qie:<MERCHANT_WALLET_ADDRESS>?amount=<QIE_AMOUNT>&token=QUSDC`.
- QIE mainnet polling every 3 seconds for matching inbound payments.
- Local transaction history with totals and CSV export.
- FastAPI backend with health and price endpoints.

## Project structure

```text
frontend/      Next.js 14 App Router application
backend/       FastAPI service for health checks and QIE price lookup
.env.example   Environment variable reference
```

## Requirements

- Node.js 18+
- Python 3.10+
- A browser wallet that supports injected providers, such as MetaMask

## Quick start

### 1. Configure environment

Copy the example file and adjust values if needed:

```bash
cp .env.example .env
```

For local development, the defaults are enough: the frontend expects the API at `http://localhost:8000`, and blockchain reads target the verified QIE mainnet JSON-RPC at `https://rpc2mainnet.qie.digital`.

### 2. Start the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
```

Price endpoint:

```bash
curl 'http://localhost:8000/price?currency=USD'
```

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` on a phone-sized viewport or mobile device.

## Blockchain behavior

All blockchain reads use QIE mainnet JSON-RPC:

```text
https://rpc2mainnet.qie.digital
```

The public explorer remains `https://mainnet.qie.digital`. Its published runtime configuration advertises `NEXT_PUBLIC_NETWORK_RPC_URL=https://rpc2mainnet.qie.digital` and `NEXT_PUBLIC_NETWORK_ID=1990`, and `eth_chainId` returns `0x7c6`, so the frontend attempts to switch the injected wallet to QIE mainnet chain ID `1990`. Payment detection checks the newest block every 3 seconds for:

1. native QIE transfers sent to the merchant wallet; and
2. optional ERC-20 `Transfer` logs if `NEXT_PUBLIC_QUSDC_CONTRACT` is configured.

A payment is accepted when the received amount is within 1% of the expected amount. Completed transactions are saved in `localStorage` only; no database or authentication service is used.

## CSV export

The dashboard exports the browser's locally stored transactions with these columns:

```text
date,fiatCurrency,fiatAmount,qieAmount,txHash
```
