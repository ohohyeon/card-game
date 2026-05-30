import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA1ss1uiyVdY31TGiNHvkItQ5_ZvqIYqGw",
  authDomain: "game-host-18b97.firebaseapp.com",
  projectId: "game-host-18b97",
  storageBucket: "game-host-18b97.firebasestorage.app",
  messagingSenderId: "621895561193",
  appId: "1:621895561193:web:be978a1db59455ed746578"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);