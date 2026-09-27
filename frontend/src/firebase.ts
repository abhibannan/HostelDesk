import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAZZlhQGPf0eXNlXYdn3cHFnMzKhF7oEqk",
  authDomain: "staynexa-17a95.firebaseapp.com",
  projectId: "staynexa-17a95",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);