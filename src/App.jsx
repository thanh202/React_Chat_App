import ChatLayout from "./components/layout/ChatLayout";
import Login from "./components/login/Login";
import Notification from "./components/notification/Notification";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase";
import useUserStore from "./lib/userStore";

const App = () => {
  const { currentUser, isLoading, fetchUserInfo } = useUserStore();

  useEffect(() => {
    const unSub = onAuthStateChanged(auth, (user) => {
      fetchUserInfo(user?.uid);
    });
    return () => {
      unSub();
    };
  }, [fetchUserInfo]);

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center p-4">
        <div className="rounded-xl bg-slate-900/80 px-8 py-6 text-lg text-white backdrop-blur-md">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] w-full items-stretch justify-center p-0 md:p-3 lg:p-4">
      <div className="flex h-[100dvh] w-full max-w-[1600px] flex-col overflow-hidden rounded-none border-0 border-white/10 bg-slate-900/75 shadow-2xl backdrop-blur-xl md:h-[92dvh] md:rounded-xl md:border md:p-3 lg:h-[90dvh] lg:p-4">
        {currentUser ? <ChatLayout /> : <Login />}
        <Notification />
      </div>
    </div>
  );
};

export default App;
