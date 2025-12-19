// src/auth/classAuth.js
import { httpsCallable } from "firebase/functions";
import { signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import { auth, functions } from "../firebase/firebaseApp";

function getDeviceId() {
  let id = localStorage.getItem("pri_deviceId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("pri_deviceId", id);
  }
  return id;
}

// ✅ 앱 시작 시 인증 대기 (auth.currentUser null 방지)
export function waitForAuthReady() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

export async function joinWithClassPassword(classId, password) {
  const deviceId = getDeviceId();
  const fn = httpsCallable(functions, "joinClass");
  const res = await fn({ classId, password, deviceId });
  await signInWithCustomToken(auth, res.data.token);
  localStorage.setItem("pri_classId", classId);
  return res.data;
}

export async function teacherWithClassPassword(classId, password) {
  const fn = httpsCallable(functions, "teacherLogin");
  const res = await fn({ classId, password });
  await signInWithCustomToken(auth, res.data.token);
  localStorage.setItem("pri_classId", classId);
  return res.data;
}
