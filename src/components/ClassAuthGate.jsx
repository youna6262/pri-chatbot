import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebaseApp";
import { joinWithClassPassword, teacherWithClassPassword } from "../auth/classAuth";
import "./ClassAuthGate.css";

export default function ClassAuthGate({ children }) {
  const [user, setUser] = useState(auth.currentUser);
  const [classId, setClassId] = useState(localStorage.getItem("pri_classId") || "");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("student"); // student | teacher
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  if (user) return children;

  const onLogin = async () => {
    setErr("");
    setLoading(true);
    try {
      if (mode === "teacher") await teacherWithClassPassword(classId.trim(), password);
      else await joinWithClassPassword(classId.trim(), password);
    } catch (err) {
      // ✅ 상세한 에러 정보 표시 (code, message, details 모두)
      console.error("LOGIN ERROR =", err);
      const code = err?.code || "no-code";
      const msg = err?.message || "no-message";
      const details = err?.details ? JSON.stringify(err.details) : "";
      setErr(`[${code}] ${msg}\n${details}`.trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-gate">
      <h2>학급 입장</h2>
      <div className="auth-mode-buttons">
        <button 
          onClick={() => setMode("student")} 
          className={`auth-mode-button ${mode === "student" ? "active" : ""}`}
        >
          👨‍🎓 학생
        </button>
        <button 
          onClick={() => setMode("teacher")} 
          className={`auth-mode-button ${mode === "teacher" ? "active" : ""}`}
        >
          👩‍🏫 교사
        </button>
      </div>

      <label className="auth-label">학급 코드</label>
      <input 
        className="auth-input"
        value={classId} 
        onChange={(e)=>setClassId(e.target.value)} 
        placeholder="예: sindaerim5-1"
      />

      <label className="auth-label">
        {mode === "teacher" ? "교사용 비밀번호" : "학급 비밀번호"}
      </label>
      <input 
        type="password" 
        className="auth-input"
        value={password} 
        onChange={(e)=>setPassword(e.target.value)} 
        placeholder="비밀번호를 입력하세요"
      />

      {err && <div className="auth-error">{err}</div>}

      <button 
        onClick={onLogin} 
        disabled={loading || !classId || !password} 
        className="auth-submit"
      >
        {loading ? "로그인 중... ✨" : "입장하기"}
      </button>

      <p className="auth-footer">
        구글 로그인 없이 학급 비밀번호로만 입장합니다.
      </p>
    </div>
  );
}
