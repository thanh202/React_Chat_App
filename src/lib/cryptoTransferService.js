import { BrowserProvider, parseEther } from "ethers";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  DEFAULT_NETWORK_KEY,
  getNetworkByKey,
  getNetworkKeyForChainIdHex,
} from "./supportedNetworks";

const requireEthereum = () => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  return window.ethereum;
};

export const connectMetaMaskWallet = async () => {
  const ethereum = requireEthereum();
  const provider = new BrowserProvider(ethereum);
  await ethereum.request({
    method: "wallet_requestPermissions",
    params: [{ eth_accounts: {} }],
  });
  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  const address = accounts?.[0];

  if (!address) {
    throw new Error("No wallet account connected");
  }

  return { provider, address };
};

/**
 * @param {string} networkKey - key trong SUPPORTED_NETWORKS
 * @param {{ onSwitching?: () => void, onAdding?: () => void, onSuccess?: () => void }} callbacks
 */
export const switchNetwork = async (networkKey, callbacks = {}) => {
  const network = getNetworkByKey(networkKey);
  const ethereum = requireEthereum();
  const targetChainId = network.chainId;

  const currentChainId = await ethereum.request({ method: "eth_chainId" });
  const currentKey = getNetworkKeyForChainIdHex(currentChainId);
  if (currentKey === network.key) {
    callbacks.onSuccess?.();
    return network;
  }

  callbacks.onSwitching?.();

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetChainId }],
    });
    callbacks.onSuccess?.();
    return network;
  } catch (switchError) {
    if (switchError?.code !== 4902) {
      throw switchError;
    }

    callbacks.onAdding?.();

    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: targetChainId,
          chainName: network.chainName,
          rpcUrls: [network.rpcUrl],
          nativeCurrency: {
            name: network.currency,
            symbol: network.currency,
            decimals: 18,
          },
          blockExplorerUrls: [network.explorerUrl],
        },
      ],
    });

    callbacks.onSuccess?.();
    return network;
  }
};

/** Chain MetaMask đang active → networkKey (dùng cho đồng bộ UI). */
export const readActiveNetworkKey = async () => {
  if (!window.ethereum) {
    return DEFAULT_NETWORK_KEY;
  }

  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  return getNetworkKeyForChainIdHex(chainId);
};

export const createSystemWalletRequestMessage = async ({
  chatId,
  senderId,
  receiverId,
}) => {
  const messageRef = await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId,
    receiverId,
    content:
      "Nguoi gui muon chuyen tien cho ban. Vui long lien ket vi MetaMask de nhan tien.",
    type: "system_request",
    requestType: "wallet_link",
    requestStatus: "pending",
    timestamp: serverTimestamp(),
  });

  return messageRef.id;
};

export const updateSystemWalletRequestStatus = async (
  chatId,
  messageId,
  requestStatus,
) => {
  await updateDoc(doc(db, "chats", chatId, "messages", messageId), {
    requestStatus,
    updatedAt: serverTimestamp(),
  });
};

export const createTextMessage = async ({ chatId, senderId, receiverId, text, img }) => {
  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId,
    receiverId,
    text,
    ...(img && { img }),
    type: "text",
    timestamp: serverTimestamp(),
  });
};

export const createPendingTransferMessage = async ({
  chatId,
  senderId,
  receiverId,
  txHash,
  fromAddress,
  toAddress,
  amount,
  networkKey = DEFAULT_NETWORK_KEY,
}) => {
  const network = getNetworkByKey(networkKey);

  const messageRef = await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId,
    receiverId,
    content: "Da tao yeu cau chuyen khoan",
    type: "crypto_transaction",
    timestamp: serverTimestamp(),
    transactionDetails: {
      txHash,
      fromAddress,
      toAddress,
      amount,
      tokenSymbol: network.currency,
      network: network.label,
      networkKey: network.key,
      chainId: network.chainId,
      status: "pending",
    },
  });

  return messageRef.id;
};

export const updateTransferStatus = async (chatId, messageId, nextStatus, blockNumber) => {
  const updatePayload = {
    "transactionDetails.status": nextStatus,
    updatedAt: serverTimestamp(),
  };

  if (blockNumber) {
    updatePayload["transactionDetails.blockNumber"] = blockNumber;
  }

  await updateDoc(doc(db, "chats", chatId, "messages", messageId), updatePayload);
};

export const sendNativeToken = async ({ toAddress, amount, networkKey = DEFAULT_NETWORK_KEY }) => {
  await switchNetwork(networkKey);
  const ethereum = requireEthereum();
  const provider = new BrowserProvider(ethereum);
  const signer = await provider.getSigner();
  const txResponse = await signer.sendTransaction({
    to: toAddress,
    value: parseEther(amount),
  });

  return { txResponse, provider, network: getNetworkByKey(networkKey) };
};
