// src/api/chatPri.js
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/firebaseApp";

export const chatPri = httpsCallable(functions, "chatPri");






