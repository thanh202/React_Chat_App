import { useState } from "react";
import "./chatList.css";
import AddUser from "./addUser/AddUser";

const Chatlist = () => {
  const [addMode, SetAddMode] = useState(false);
  return (
    <div className="chatList">
      <div className="search">
        <div className="searchBar">
          <img src="./search.png" alt="search" />
          <input type="text" placeholder="Search" />
        </div>
        <img
          src={addMode ? "./minus.png" : "./plus.png"}
          alt="plus"
          className="add"
          onClick={() => SetAddMode((prev) => !prev)}
        />
      </div>
      <div className="item">
        <img src="./avatar.png" alt="avatar" />
        <div className="texts">
          <h2>John Doe</h2>
          <p>Hello, how are you?</p>
        </div>
      </div>
      <div className="item">
        <img src="./avatar.png" alt="avatar" />
        <div className="texts">
          <h2>John Doe</h2>
          <p>Hello, how are you?</p>
        </div>
      </div>
      <div className="item">
        <img src="./avatar.png" alt="avatar" />
        <div className="texts">
          <h2>John Doe</h2>
          <p>Hello, how are you?</p>
        </div>
      </div>
      <div className="item">
        <img src="./avatar.png" alt="avatar" />
        <div className="texts">
          <h2>John Doe</h2>
          <p>Hello, how are you?</p>
        </div>
      </div>
      {addMode && <AddUser />}
    </div>
  );
};

export default Chatlist;
