import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  // @ts-ignore - getReactNativePersistence is exported by the React Native entry point
  getReactNativePersistence,
  getAuth,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyAZZlhQGPf0eXNlXYdn3cHFnMzKhF7oEqk",
  authDomain: "staynexa-17a95.firebaseapp.com",
  projectId: "staynexa-17a95",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;