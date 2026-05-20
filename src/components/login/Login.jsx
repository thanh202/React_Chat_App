import { useState } from "react";
import "./login.css";
import { toast } from "react-toastify";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import imageUploader from "../../lib/uploadImage";

const Login = () => {
  const [avatar, setAvatar] = useState({
    file: null,
    url: "",
  });

  const [loading, setLoading] = useState(false);

  const handleAvatar = (e) => {
    if (e.target?.files[0]) {
      setAvatar({
        file: e.target?.files[0],
        url: URL.createObjectURL(e.target?.files[0]),
      });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);

    const { email, password } = Object.fromEntries(formData);
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.log(error);
        toast.error(error.message);
    } finally {
        setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);

    const { username, email, password } = Object.fromEntries(formData);

    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);

      const imgUrl = await imageUploader(avatar.file);

      // Add a new document in collection "cities"
      await setDoc(doc(db, "users", res.user.uid), {
        username,
        email,
        avatar: imgUrl,
        id: res.user.uid,
        blocked: [],
        walletAddresses: [],
      });

      await setDoc(doc(db, "userchats", res.user.uid), {
        chats: [],
      });
      toast.success("Account created successfully! You can login now.");
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    } finally {
        setLoading(false);
    }
  };
  return (
    <div className="login flex h-full min-h-0 w-full flex-col gap-6 overflow-y-auto p-4 md:flex-row md:items-center md:justify-center md:gap-10 md:p-8">
      <div className="item">
        <h2>Welcome back,</h2>
        <form onSubmit={handleLogin}>
          <input type="text" placeholder="Email" name="email" />
          <input type="password" placeholder="Password" name="password" />
          <button disabled={loading}>{loading ? "Signing In..." : "Sign In"}</button>
        </form>
      </div>
      <div className="sepatator"></div>
      <div className="item">
        <h2>Create an Account</h2>
        <form onSubmit={handleRegister}>
          <label htmlFor="file">
            <img src={avatar.url || "./avatar.png"} alt="" />
            Upload an Image
          </label>
          <input
            type="file"
            id="file"
            style={{ display: "none" }}
            onChange={handleAvatar}
          />
          <input type="text" placeholder="Username" name="username" />
          <input type="email" placeholder="Email" name="email" />
          <input type="password" placeholder="Password" name="password" />
          <button disabled={loading}>{loading ? "Signing Up..." : "Sign Up"}</button>
        </form>
      </div>
    </div>
  );
};

export default Login;
