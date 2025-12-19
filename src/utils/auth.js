// src/utils/auth.js
import { auth, functions } from "../firebase/firebaseApp";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, signInWithCustomToken } from "firebase/auth";
import { httpsCallable } from "firebase/functions";

export async function signInSchoolGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    return await signInWithPopup(auth, provider);
  } catch (e) {
    // 팝업 막힘/환경 이슈면 redirect로
    return await signInWithRedirect(auth, provider);
  }
}

// ✅ 학급 비밀번호로 로그인
export async function joinWithClassPassword(classId, password) {
  const joinClass = httpsCallable(functions, "joinClass");
  const res = await joinClass({ classId, password }); // { token }
  await signInWithCustomToken(auth, res.data.token);
}


