import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

// ✅ Firebase 설정(일단은 하드코딩으로도 OK. 나중에 .env로 옮기면 됨)
const firebaseConfig = {
  apiKey: "AIzaSyDabSyqFUWAAiQMaIboCb-5WoNLpCqSCKg",
  authDomain: "pri-chatbot.firebaseapp.com",
  projectId: "pri-chatbot",
  storageBucket: "pri-chatbot.firebasestorage.app",
  messagingSenderId: "1094835838940",
  appId: "1:1094835838940:web:9b5ac1aa225bb8819e3919",
  measurementId: "G-D20V67GPC4",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, "us-central1"); // ✅ 리전 명시 (기본값이지만 명확히)

