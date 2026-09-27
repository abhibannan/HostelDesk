import { db } from "./src/config/firebase.js";

async function checkAdmin() {
  try {
    const snapshot = await db
      .collection("users")
      .where("firebaseUid", "==", "zP1wV7yBXRQ34xRVBqRJpiqfcwP2")
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log("PROFILE NOT FOUND");
      return;
    }

    console.log("ADMIN PROFILE:");
    console.log(snapshot.docs[0]?.data());
  } catch (error) {
    console.error("CHECK ADMIN ERROR:", error);
  }
}

checkAdmin();
