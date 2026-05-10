import { useEffect, useState } from "react";
import "./chatList.css";
import AddUser from "./addUser/AddUser";
import useUserStore from "../../../lib/userStore";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { getAvatarUrl } from "../../../utils/cloudinaryHelper";
import useChatStore from "../../../lib/chatStore";

const Chatlist = () => {
  const [addMode, SetAddMode] = useState(false);
  const [chats, setChats] = useState([]);
  const [input, setInput] = useState("");
  const { currentUser } = useUserStore();
  const { changeChat, chatId } = useChatStore();

  useEffect(() => {
    const unSub = onSnapshot(
      doc(db, "userchats", currentUser.id),
      async (res) => {
        const items = res.data().chats;

        const promises = items.map(async (item) => {
          const userDocRef = doc(db, "users", item.receiverId);
          const userDocSnap = await getDoc(userDocRef);

          const user = userDocSnap.data();

          return { ...item, user };
        });

        const chatData = await Promise.all(promises);

        setChats(
          chatData.sort((a, b) => {
            b.updatedAt - a.updatedAt;
          }),
        );
      },
    );
    return () => {
      unSub();
    };
  }, [currentUser.id]);

  const handleSelect = async (chat) => {
    const userChats = chats.map((item) => {
      const { user, ...rest } = item;
      return rest;
    });

    const chatIndex = userChats.findIndex(
      (item) => item.chatId === chat.chatId,
    );

    userChats[chatIndex].isSeen = true;

    const userChatsRef = doc(db, "userchats", currentUser.id);
    try {
      await updateDoc(userChatsRef, {
        chats: userChats,
      });
      await changeChat(chat.chatId, chat.user);
    } catch (error) {
      console.log(error);
    }
  };

  const filteredChats = chats.filter((c) =>
    c.user.username.toLowerCase().includes(input.toLowerCase()),
  );
  return (
    <div className="chatList">
      <div className="search">
        <div className="searchBar">
          <img src="./search.png" alt="search" />
          <input
            type="text"
            placeholder="Search"
            onChange={(e) => {
              setInput(e.target.value);
            }}
          />
        </div>
        <img
          src={addMode ? "./minus.png" : "./plus.png"}
          alt="plus"
          className="add"
          onClick={() => SetAddMode((prev) => !prev)}
        />
      </div>
      {filteredChats.map((chat) => (
        <div
          className="item"
          key={chat.chatId}
          onClick={() => handleSelect(chat)}
          style={{ backgroundColor: chat.isSeen ? "transparent" : "#5183fe" }}
        >
          <img
            src={
              chat.user.blocked.includes(currentUser.id)
                ? "./avatar.png"
                : getAvatarUrl(chat.user.avatar) || "./avatar.png"
            }
            alt="avatar"
          />
          <div className="texts">
            <h2>
              {chat.user.blocked.includes(currentUser.id)
                ? "User"
                : chat.user.username}
            </h2>
            <p>{chat.lastMessage}</p>
          </div>
        </div>
      ))}
      {addMode && <AddUser />}
    </div>
  );
};

export default Chatlist;
