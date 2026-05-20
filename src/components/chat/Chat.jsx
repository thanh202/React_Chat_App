import { useEffect, useRef, useState } from "react";
import "./chat.css";
import EmojiPicker from "emoji-picker-react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import useChatStore from "../../lib/chatStore";
import useUserStore from "../../lib/userStore";
import imageUploader from "../../lib/uploadImage";
import { format } from "timeago.js";
import { getChatImageUrl } from "../../utils/cloudinaryHelper";
import { toast } from "react-toastify";
import {
  dismissTransferLoadingToast,
  showBlockchainErrorToast,
  showTransferLoadingToast,
  showTransferSuccessToast,
} from "../../lib/blockchainToast";
import CryptoTransferModal from "./CryptoTransferModal";
import CryptoReceiptCard from "./CryptoReceiptCard";
import {
  connectMetaMaskWallet,
  createPendingTransferMessage,
  createSystemWalletRequestMessage,
  createTextMessage,
  readActiveNetworkKey,
  sendNativeToken,
  switchNetwork,
  updateSystemWalletRequestStatus,
  updateTransferStatus,
} from "../../lib/cryptoTransferService";
import {
  DEFAULT_NETWORK_KEY,
  getNetworkKeyForChainIdHex,
} from "../../lib/supportedNetworks";
import {
  getDefaultWallet,
  addWalletAddressIfNotExists,
  getUserWallets,
  linkWalletAddress,
  normalizeWalletAddress,
  setDefaultWalletAddress,
} from "../../lib/walletService";

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [text, setText] = useState("");
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [senderWallets, setSenderWallets] = useState([]);
  const [receiverWallets, setReceiverWallets] = useState([]);
  const [selectedSenderWallet, setSelectedSenderWallet] = useState("");
  const [activeSenderWallet, setActiveSenderWallet] = useState("");
  const [selectedReceiverWallet, setSelectedReceiverWallet] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState(DEFAULT_NETWORK_KEY);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [pendingSystemRequestId, setPendingSystemRequestId] = useState("");
  const [img, setImg] = useState({
    file: null,
    url: "",
  });
  const { chatId, user, isCurrentUserBlocked, isReceiverBlocked } =
    useChatStore();
  const { currentUser } = useUserStore();

  const handleEmoji = (e) => {
    setText((prev) => prev + e.emoji);
  };

  const handleImg = (e) => {
    if (e.target?.files[0]) {
      setImg({
        file: e.target?.files[0],
        url: URL.createObjectURL(e.target?.files[0]),
      });
    }
  };
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!chatId) return undefined;

    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));
    const unSub = onSnapshot(q, (snapshot) => {
      const nextMessages = snapshot.docs.map((messageDoc) => ({
        id: messageDoc.id,
        ...messageDoc.data(),
      }));
      setMessages(nextMessages);
    });

    return () => {
      unSub();
    };
  }, [chatId]);

  useEffect(() => {
    if (!isTransferModalOpen) return undefined;

    const ethereum = window.ethereum;
    if (!ethereum) return undefined;

    let cancelled = false;

    const syncFromWallet = async () => {
      try {
        const key = await readActiveNetworkKey();
        if (!cancelled) {
          setSelectedNetwork(key);
        }
      } catch {
        /* ignore */
      }
    };

    void syncFromWallet();

    const onChainChanged = (chainId) => {
      setSelectedNetwork(getNetworkKeyForChainIdHex(chainId));
    };

    ethereum.on?.("chainChanged", onChainChanged);

    return () => {
      cancelled = true;
      ethereum.removeListener?.("chainChanged", onChainChanged);
    };
  }, [isTransferModalOpen]);

  const syncUserChatPreview = async (lastMessageText) => {
    const userIDs = [currentUser.id, user.id];

    userIDs.forEach(async (id) => {
      const userChatsRef = doc(db, "userchats", id);
      const userChatsSnapshot = await getDoc(userChatsRef);

      if (!userChatsSnapshot.exists()) return;

      const userChatsData = userChatsSnapshot.data();
      const chatIndex = userChatsData.chats.findIndex(
        (c) => c.chatId === chatId,
      );

      if (chatIndex < 0) return;

      userChatsData.chats[chatIndex].lastMessage = lastMessageText;
      userChatsData.chats[chatIndex].isSeen = id === currentUser.id;
      userChatsData.chats[chatIndex].updatedAt = Date.now();

      await updateDoc(userChatsRef, {
        chats: userChatsData.chats,
      });
    });
  };

  const handleSend = async () => {
    if (text === "") return;
    let imgUrl = null;

    try {
      if (img.file) {
        imgUrl = await imageUploader(img.file);
      }

      await createTextMessage({
        chatId,
        senderId: currentUser.id,
        receiverId: user.id,
        text,
        img: imgUrl,
      });
      await syncUserChatPreview(text);
    } catch (error) {
      console.log(error);
    } finally {
      setImg({
        file: null,
        url: "",
      });
      setText("");
    }
  };

  const handleTransferClick = async () => {
    if (!user || !chatId) return;

    try {
      let nextSenderWallets = await getUserWallets(currentUser.id);
      const nextReceiverWallets = await getUserWallets(user.id);
      setReceiverWallets(nextReceiverWallets);

      if (!nextSenderWallets.length) {
        const { address } = await connectMetaMaskWallet();
        nextSenderWallets = await linkWalletAddress(
          currentUser.id,
          address,
          true,
        );
        setSenderWallets(nextSenderWallets);
        await useUserStore.getState().fetchUserInfo(currentUser.id);
        toast.success("Da lien ket vi gui. Tiep tuc chuyen khoan.");
      } else {
        setSenderWallets(nextSenderWallets);
      }

      if (!nextReceiverWallets.length) {
        const pendingMessageId = await createSystemWalletRequestMessage({
          chatId,
          senderId: currentUser.id,
          receiverId: user.id,
        });
        setPendingSystemRequestId(pendingMessageId);
        await syncUserChatPreview("Yeu cau lien ket vi de nhan tien");
        toast.info("Nguoi nhan chua lien ket vi. Da gui yeu cau lien ket.");
        return;
      }

      setSelectedSenderWallet(
        getDefaultWallet(nextSenderWallets)?.address ?? "",
      );
      setActiveSenderWallet(getDefaultWallet(nextSenderWallets)?.address ?? "");
      setSelectedReceiverWallet(
        getDefaultWallet(nextReceiverWallets)?.address ?? "",
      );
      setIsTransferModalOpen(true);
    } catch (error) {
      toast.error(error.message ?? "Khong the khoi tao chuyen khoan");
    }
  };

  const handleSendWalletRequest = async () => {
    try {
      const pendingMessageId = await createSystemWalletRequestMessage({
        chatId,
        senderId: currentUser.id,
        receiverId: user.id,
      });
      setPendingSystemRequestId(pendingMessageId);
      await syncUserChatPreview("Yeu cau lien ket vi de nhan tien");
      toast.success("Da gui yeu cau lien ket vi.");
    } catch (error) {
      toast.error(error.message ?? "Khong gui duoc yeu cau lien ket vi");
    }
  };

  const handleLinkWalletFromSystemRequest = async (messageId) => {
    try {
      const { address } = await connectMetaMaskWallet();
      await linkWalletAddress(currentUser.id, address, true);
      await useUserStore.getState().fetchUserInfo(currentUser.id);
      await updateSystemWalletRequestStatus(chatId, messageId, "linked");
      toast.success("Lien ket vi thanh cong.");
    } catch (error) {
      toast.error(error.message ?? "Lien ket vi that bai");
    }
  };

  const handleConfirmTransfer = async () => {
    const fromAddress = normalizeWalletAddress(
      activeSenderWallet || selectedSenderWallet,
    );
    const toAddress = normalizeWalletAddress(selectedReceiverWallet);
    const amount = transferAmount?.trim();

    if (!fromAddress || !toAddress || !amount || Number(amount) <= 0) {
      toast.error("Vui lòng nhập đầy đủ thông tin chuyển khoản.");
      return;
    }

    setIsTransferring(true);
    showTransferLoadingToast();

    let pendingMessageId = null;

    try {
      const { address } = await connectMetaMaskWallet();
      if (normalizeWalletAddress(address) !== fromAddress) {
        throw new Error("Vi dang ket noi khong trung voi vi gui da chon");
      }

      const { txResponse, provider, network } = await sendNativeToken({
        toAddress,
        amount,
        networkKey: selectedNetwork,
      });

      const txHash = txResponse?.hash;
      if (!txHash) {
        throw new Error("Khong nhan duoc ma giao dich tu mang luoi");
      }

      pendingMessageId = await createPendingTransferMessage({
        chatId,
        senderId: currentUser.id,
        receiverId: user.id,
        txHash,
        fromAddress,
        toAddress,
        amount,
        networkKey: selectedNetwork,
      });
      await syncUserChatPreview(`Chuyen ${amount} ${network.currency}`);

      dismissTransferLoadingToast();
      showTransferSuccessToast();

      setIsTransferModalOpen(false);
      setTransferAmount("");

      const onChainFailureMessage =
        "Giao dich da duoc ghi nhan nhung thuc thi that bai tren blockchain.";
      const waitFailureMessage =
        "Giao dich that bai: khong the xac nhan trang thai tren mang luoi (nghẽn mang hoac loi thuc thi).";

      provider
        .waitForTransaction(txHash)
        .then(async (receipt) => {
          const nextStatus = receipt?.status === 1 ? "success" : "failed";
          await updateTransferStatus(
            chatId,
            pendingMessageId,
            nextStatus,
            receipt?.blockNumber,
            nextStatus === "failed" ? onChainFailureMessage : undefined,
          );
          if (nextStatus === "failed") {
            toast.error(
              "❌ Giao dịch thất bại trên blockchain. Biên lai đã được cập nhật trong khung chat.",
              { toastId: "crypto-transfer-onchain-failed" },
            );
          }
        })
        .catch(async (waitError) => {
          console.error("waitForTransaction failed:", waitError);
          if (pendingMessageId) {
            await updateTransferStatus(
              chatId,
              pendingMessageId,
              "failed",
              undefined,
              waitFailureMessage,
            );
            toast.error(
              "❌ Không xác nhận được giao dịch trên mạng. Biên lai đã chuyển sang trạng thái thất bại.",
              { toastId: "crypto-transfer-wait-failed" },
            );
          }
        });
    } catch (error) {
      console.error("handleConfirmTransfer:", error);
      dismissTransferLoadingToast();
      showBlockchainErrorToast(error);
      // Chưa có txHash → không tạo tin nhắn Firestore (createPendingTransferMessage không được gọi)
    } finally {
      setIsTransferring(false);
    }
  };

  const handleSenderWalletChange = (walletAddress) => {
    setSelectedSenderWallet(walletAddress);
    setActiveSenderWallet(walletAddress);
  };

  const handleAddNewWallet = async () => {
    try {
      const { address } = await connectMetaMaskWallet();
      const { nextWallets, alreadyLinked } = await addWalletAddressIfNotExists(
        currentUser.id,
        address,
      );

      if (alreadyLinked) {
        toast.info("Dia chi vi nay da duoc lien ket voi tai khoan cua ban");
        return;
      }

      const normalizedAddress = normalizeWalletAddress(address);
      setSenderWallets(nextWallets);
      setSelectedSenderWallet(normalizedAddress);
      setActiveSenderWallet(normalizedAddress);
      await useUserStore.getState().fetchUserInfo(currentUser.id);
      toast.success("Da them vi moi thanh cong");
    } catch (error) {
      toast.error(error.message ?? "Khong the them vi moi");
    }
  };

  const handleNetworkChange = async (networkKey) => {
    setSelectedNetwork(networkKey);
    setIsSwitchingNetwork(true);

    try {
      await switchNetwork(networkKey, {
        onSwitching: () =>
          toast.info("Dang yeu cau chuyen mang...", {
            toastId: "switch-network",
          }),
        onAdding: () =>
          toast.info("Dang tu dong them cau hinh mang moi...", {
            toastId: "add-network",
          }),
        onSuccess: () =>
          toast.success("Chuyen mang thanh cong!", {
            toastId: "switch-success",
          }),
      });
    } catch (error) {
      toast.error(error.message ?? "Khong the chuyen mang");
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  const handleSetDefaultWallet = async (walletAddress) => {
    try {
      const nextWallets = await setDefaultWalletAddress(
        currentUser.id,
        walletAddress,
      );
      const defaultWallet = getDefaultWallet(nextWallets)?.address ?? "";
      setSenderWallets(nextWallets);
      setSelectedSenderWallet(defaultWallet);
      setActiveSenderWallet(defaultWallet);
      await useUserStore.getState().fetchUserInfo(currentUser.id);
      toast.success("Da cap nhat vi mac dinh");
    } catch (error) {
      toast.error(error.message ?? "Khong the dat vi mac dinh");
    }
  };

  const renderMessageBody = (message) => {
    if (message.type === "system_request") {
      const isReceiverView = message.receiverId === currentUser.id;
      const isPending = message.requestStatus !== "linked";

      return (
        <div className="systemRequestCard">
          <p>
            {isPending
              ? "Nguoi gui muon chuyen tien cho ban. Vui long lien ket vi MetaMask de nhan tien."
              : "Da lien ket vi thanh cong. Ban da co the nhan tien."}
          </p>
          {isReceiverView && isPending && (
            <button
              type="button"
              onClick={() => handleLinkWalletFromSystemRequest(message.id)}
            >
              Lien ket vi ngay
            </button>
          )}
        </div>
      );
    }

    if (message.type === "crypto_transaction") {
      return (
        <CryptoReceiptCard message={message} currentUserId={currentUser.id} />
      );
    }

    return (
      <>
        {message.img && <img src={message.img} alt="chat media" />}
        <p>{message.text}</p>
      </>
    );
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp?.toDate) return "just now";
    return format(timestamp.toDate());
  };

  return (
    <div className="chat">
      <div className="top">
        <div className="user">
          <img src={user?.avatar || "/avatar.png"} alt="avatar" />
          <div className="texts">
            <span>{user?.username}</span>
            <p>{user?.bio}</p>
          </div>
        </div>
        <div className="icons">
          <img src="./phone.png" alt="phone" />
          <img src="./video.png" alt="video" />
          <img src="./info.png" alt="info" />
        </div>
      </div>
      <div className="center">
        {messages.map((message) => (
          <div
            className={
              message.senderId === currentUser?.id ? "message own" : "message"
            }
            key={message.id}
          >
            <div className="texts">
              {renderMessageBody(message)}
              <span>{formatMessageTime(message.timestamp)}</span>
            </div>
          </div>
        ))}
        {img.url && (
          <div className="message own">
            <div className="texts">
              <img src={getChatImageUrl(img.url)} alt="" />
            </div>
          </div>
        )}
        <div ref={endRef}></div>
      </div>

      <div className="bottom">
        <div className="icons">
          <label htmlFor="file">
            <img src="./img.png" alt="" />
          </label>
          <input
            type="file"
            id="file"
            style={{ display: "none" }}
            onChange={handleImg}
          />
          <img src="./camera.png" alt="" />
          <img src="./mic.png" alt="" />
        </div>
        <input
          type="text"
          placeholder={
            isCurrentUserBlocked || isReceiverBlocked
              ? "You can't send a message"
              : "Type a message..."
          }
          onChange={(e) => setText(e.target.value)}
          value={text}
          disabled={isCurrentUserBlocked || isReceiverBlocked}
        />
        <div className="emoji">
          <img
            src="./emoji.png"
            alt="emoji"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
          />
          <div className="picker">
            <EmojiPicker open={showEmojiPicker} onEmojiClick={handleEmoji} />
          </div>
        </div>
        <button
          className="sendButton"
          onClick={handleSend}
          disabled={isCurrentUserBlocked || isReceiverBlocked}
        >
          Send
        </button>
        <button
          className="sendButton transferButton"
          onClick={handleTransferClick}
          disabled={isCurrentUserBlocked || isReceiverBlocked}
        >
          Chuyen tien
        </button>
      </div>
      {receiverWallets.length === 0 && pendingSystemRequestId && (
        <div className="walletRequestBanner">
          <span>Nguoi nhan chua co vi. Ban co the gui nhac lai.</span>
          <button type="button" onClick={handleSendWalletRequest}>
            Gui yeu cau lien ket vi
          </button>
        </div>
      )}
      <CryptoTransferModal
        isOpen={isTransferModalOpen}
        senderWallets={senderWallets}
        receiverWallets={receiverWallets}
        selectedSenderWallet={selectedSenderWallet}
        selectedReceiverWallet={selectedReceiverWallet}
        selectedNetwork={selectedNetwork}
        amount={transferAmount}
        onSenderWalletChange={handleSenderWalletChange}
        onReceiverWalletChange={setSelectedReceiverWallet}
        onNetworkChange={handleNetworkChange}
        onAmountChange={setTransferAmount}
        onConfirm={handleConfirmTransfer}
        onClose={() => setIsTransferModalOpen(false)}
        isSubmitting={isTransferring}
        isSwitchingNetwork={isSwitchingNetwork}
        onAddNewWallet={handleAddNewWallet}
        onSetDefaultWallet={handleSetDefaultWallet}
      />
    </div>
  );
};

export default Chat;
