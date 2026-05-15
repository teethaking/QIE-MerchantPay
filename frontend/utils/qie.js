import { ethers } from "ethers";

const QIE_RPC_URL = process.env.NEXT_PUBLIC_QIE_RPC_URL || "https://rpc2mainnet.qie.digital";
const QIE_CHAIN_ID = Number(process.env.NEXT_PUBLIC_QIE_CHAIN_ID || "1990");
const QIE_CHAIN_HEX = `0x${QIE_CHAIN_ID.toString(16)}`;
const QUSDC_CONTRACT = process.env.NEXT_PUBLIC_QUSDC_CONTRACT || "";
const TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)");

export const provider = new ethers.JsonRpcProvider(QIE_RPC_URL, QIE_CHAIN_ID);

const erc20Interface = new ethers.Interface([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeAddress(address) {
  return ethers.getAddress(address);
}

function isWithinTolerance(actual, expected, toleranceBps = 100n) {
  // Accept payments within 1% so tiny conversion or token-decimal differences do not block checkout.
  const expectedValue = BigInt(expected);
  const actualValue = BigInt(actual);
  const tolerance = (expectedValue * toleranceBps) / 10000n;
  const min = expectedValue > tolerance ? expectedValue - tolerance : 0n;
  const max = expectedValue + tolerance;
  return actualValue >= min && actualValue <= max;
}

async function ensureQieNetwork(ethereum) {
  // Ask the wallet to switch to QIE mainnet, adding it when the wallet has not seen it before.
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: QIE_CHAIN_HEX }],
    });
  } catch (error) {
    if (error?.code !== 4902) {
      throw error;
    }

    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: QIE_CHAIN_HEX,
          chainName: "QIE Mainnet",
          nativeCurrency: { name: "QIE", symbol: "QIE", decimals: 18 },
          rpcUrls: [QIE_RPC_URL],
          blockExplorerUrls: ["https://mainnet.qie.digital"],
        },
      ],
    });
  }
}

export async function connectWallet() {
  // Connect to the user's injected wallet and return the selected merchant address.
  if (!isBrowser() || !window.ethereum) {
    throw new Error("No injected wallet found. Install MetaMask or another EIP-1193 wallet.");
  }

  await ensureQieNetwork(window.ethereum);
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });

  if (!accounts?.length) {
    throw new Error("Wallet connection was rejected or returned no accounts.");
  }

  return normalizeAddress(accounts[0]);
}

async function findNativePayment(block, merchantAddress, expectedWei) {
  // Scan full transactions in the latest block for direct native QIE transfers to the merchant.
  const transactions = block?.prefetchedTransactions || [];
  for (const tx of transactions) {
    if (!tx?.to || normalizeAddress(tx.to) !== merchantAddress) {
      continue;
    }

    if (isWithinTolerance(tx.value, expectedWei)) {
      return tx.hash;
    }
  }

  return null;
}

async function findTokenPayment(blockNumber, merchantAddress, expectedWei) {
  // If a QUSDC contract is configured, scan ERC-20 Transfer logs in the same block.
  if (!QUSDC_CONTRACT || !ethers.isAddress(QUSDC_CONTRACT)) {
    return null;
  }

  const paddedMerchant = ethers.zeroPadValue(merchantAddress, 32);
  const logs = await provider.getLogs({
    address: normalizeAddress(QUSDC_CONTRACT),
    fromBlock: blockNumber,
    toBlock: blockNumber,
    topics: [TRANSFER_TOPIC, null, paddedMerchant],
  });

  for (const log of logs) {
    const parsed = erc20Interface.parseLog(log);
    if (isWithinTolerance(parsed.args.value, expectedWei)) {
      return log.transactionHash;
    }
  }

  return null;
}

export function pollForPayment(merchantAddress, expectedAmount, onConfirmed, onError) {
  // Poll QIE mainnet every 3 seconds and call onConfirmed once a matching transfer is observed.
  let stopped = false;
  let lastCheckedBlock = null;
  const merchant = normalizeAddress(merchantAddress);
  const expectedWei = ethers.parseUnits(String(expectedAmount || "0"), 18);

  const checkLatestBlock = async () => {
    if (stopped || expectedWei <= 0n) {
      return;
    }

    try {
      const blockNumber = await provider.getBlockNumber();
      if (lastCheckedBlock !== null && blockNumber <= lastCheckedBlock) {
        return;
      }

      const fromBlock = lastCheckedBlock === null ? blockNumber : lastCheckedBlock + 1;
      for (let currentBlock = fromBlock; currentBlock <= blockNumber; currentBlock += 1) {
        const block = await provider.getBlock(currentBlock, true);
        const nativeTx = await findNativePayment(block, merchant, expectedWei);
        const tokenTx = nativeTx || (await findTokenPayment(currentBlock, merchant, expectedWei));

        if (tokenTx) {
          stopped = true;
          onConfirmed(tokenTx);
          return;
        }
      }

      lastCheckedBlock = blockNumber;
    } catch (error) {
      if (onError) {
        onError(error);
      }
    }
  };

  checkLatestBlock();
  const intervalId = setInterval(checkLatestBlock, 3000);

  return () => {
    stopped = true;
    clearInterval(intervalId);
  };
}
