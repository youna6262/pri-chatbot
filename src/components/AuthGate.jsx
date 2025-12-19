import { useEffect, useState } from "react";
import { auth } from "../firebase/firebaseApp";
import { onAuthStateChanged } from "firebase/auth";
import { signInSchoolGoogle } from "../utils/auth";
import "./AuthGate.css";

export default function AuthGate({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInSchoolGoogle();
    } catch (error) {
      console.error("로그인 실패:", error);
      alert("로그인에 실패했습니다: " + (error.message || error));
    }
  };

  if (loading) {
    return (
      <div className="authGate">
        <div className="authGateContent">
          <div className="loading">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="authGate">
        <div className="authGateContent">
          <h2>학교 계정으로 시작하기</h2>
          <p>프랙탈 작품을 만들고 공유하려면 로그인이 필요해요.</p>
          <button className="authButton" onClick={handleSignIn}>
            Google로 로그인
          </button>
        </div>
      </div>
    );
  }

  return children;
}







