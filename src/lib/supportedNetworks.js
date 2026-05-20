export const SUPPORTED_NETWORKS = {
  polygon: {
    key: "polygon",
    label: "Polygon",
    chainId: "0x13882",
    chainIdDecimal: 80002,
    chainName: "Polygon Amoy Testnet",
    rpcUrl: "https://rpc-amoy.polygon.technology",
    currency: "POL",
    explorerUrl: "https://amoy.polygonscan.com",
    explorerTxPath: "/tx/",
  },
  ronin: {
    key: "ronin",
    label: "Ronin",
    chainId: "0x7e5",
    chainIdDecimal: 2021,
    chainName: "Ronin Testnet Saigon",
    rpcUrl: "https://api-gateway.skymavis.com/rpc/testnet",
    currency: "RON",
    explorerUrl: "https://saigon-app.roninchain.com",
    explorerTxPath: "/tx/",
  },
  ethereum: {
    key: "ethereum",
    label: "Ethereum",
    chainId: "0xaa36a7",
    chainIdDecimal: 11155111,
    chainName: "Sepolia test network",
    rpcUrl: "https://rpc.sepolia.org",
    currency: "ETH",
    explorerUrl: "https://sepolia.etherscan.io",
    explorerTxPath: "/tx/",
  },
  bsc: {
    key: "bsc",
    label: "BSC",
    chainId: "0x61",
    chainIdDecimal: 97,
    chainName: "Binance Smart Chain Testnet",
    rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545",
    currency: "BNB",
    explorerUrl: "https://testnet.bscscan.com",
    explorerTxPath: "/tx/",
  },
  arbitrum: {
    key: "arbitrum",
    label: "Arbitrum",
    chainId: "0x66eee",
    chainIdDecimal: 421614,
    chainName: "Arbitrum Sepolia",
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    currency: "ETH",
    explorerUrl: "https://sepolia.arbiscan.io",
    explorerTxPath: "/tx/",
  },
};

export const DEFAULT_NETWORK_KEY = "polygon";

export const NETWORK_OPTIONS = Object.values(SUPPORTED_NETWORKS);

export const getNetworkByKey = (networkKey) =>
  SUPPORTED_NETWORKS[networkKey] ?? SUPPORTED_NETWORKS[DEFAULT_NETWORK_KEY];

export const getTransactionExplorerUrl = (networkKey, txHash) => {
  if (!txHash) return "";

  const network = getNetworkByKey(networkKey);
  const base = network.explorerUrl.replace(/\/$/, "");
  const path = network.explorerTxPath ?? "/tx/";
  return `${base}${path}${txHash}`;
};

export const getNetworkSelectLabel = (network) =>
  `${network.label} (${network.currency})`;

/**
 * Map eth_chainId (hex) sang networkKey. So khớp theo chainIdDecimal.
 */
export const getNetworkKeyForChainIdHex = (chainIdHex) => {
  if (chainIdHex == null || chainIdHex === "") {
    return DEFAULT_NETWORK_KEY;
  }

  let num;
  if (typeof chainIdHex === "string" && chainIdHex.startsWith("0x")) {
    num = Number.parseInt(chainIdHex, 16);
  } else {
    num = Number(chainIdHex);
  }

  if (!Number.isFinite(num)) {
    return DEFAULT_NETWORK_KEY;
  }

  const match = NETWORK_OPTIONS.find((n) => n.chainIdDecimal === num);
  return match?.key ?? DEFAULT_NETWORK_KEY;
};

export const resolveNetworkKeyFromTransaction = (transactionDetails = {}) => {
  if (transactionDetails.networkKey) {
    return transactionDetails.networkKey;
  }

  const matched = NETWORK_OPTIONS.find(
    (network) => network.label === transactionDetails.network,
  );
  return matched?.key ?? DEFAULT_NETWORK_KEY;
};
