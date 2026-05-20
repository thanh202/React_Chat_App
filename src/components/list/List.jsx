import Chatlist from "./chatList/Chatlist"
import "./list.css"
import Userinfo from "./userInfo/Userinfo"

const List = () => {
  return (
    <div className="list flex h-full min-h-0 w-full flex-col">
      <Userinfo />
      <Chatlist />
    </div>
  );
};

export default List