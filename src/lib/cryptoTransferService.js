import { BrowserProvider, parseEther } from "ethers";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export const POLYGON_AMOY_CHAIN_ID = "0x13882";
export const POLYGON_AMOY_EXPLORER = "https://amoy.polygonscan.com/tx/";

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

export const ensurePolygonAmoyNetwork = async () => {
  const ethereum = requireEthereum();
  const currentChainId = await ethereum.request({ method: "eth_chainId" });

  if (currentChainId === POLYGON_AMOY_CHAIN_ID) return;

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: POLYGON_AMOY_CHAIN_ID }],
    });
  } catch (error) {
    if (error?.code !== 4902) throw error;

    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: POLYGON_AMOY_CHAIN_ID,
          chainName: "Polygon Amoy Testnet",
          nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
          rpcUrls: ["https://rpc-amoy.polygon.technology"],
          blockExplorerUrls: ["https://amoy.polygonscan.com"],
        },
      ],
    });
  }
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
}) => {
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
      tokenSymbol: "POL",
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

export const sendNativeToken = async ({ toAddress, amount }) => {
  await ensurePolygonAmoyNetwork();
  const ethereum = requireEthereum();
  const provider = new BrowserProvider(ethereum);
  const signer = await provider.getSigner();
  const txResponse = await signer.sendTransaction({
    to: toAddress,
    value: parseEther(amount),
  });

  return { txResponse, provider };
};
