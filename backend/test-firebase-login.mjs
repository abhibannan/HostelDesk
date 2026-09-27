import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAZZlhQGPf0eXNlXYdn3cHFnMzKhF7oEqk",
  authDomain: "staynexa-17a95.firebaseapp.com",
  projectId: "staynexa-17a95",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error(
    "Usage: node test-firebase-login.mjs EMAIL PASSWORD",
  );
  process.exit(1);
}

try {
  const credential = await signInWithEmailAndPassword(
    auth,
    email,
    password,
  );

  const token = await credential.user.getIdToken();

  console.log("\nFirebase login successful.");
  console.log("\nFirebase ID Token:\n");
  console.log(token);
} catch (error) {
  console.error("\nFirebase login failed:");
  console.error(error.message);
  process.exit(1);
}