import { db } from "./src/config/firebase.js";

async function findAdmin() {
  try {
    const snapshot = await db
      .collection("users")
      .where("firebaseUid", "==", "zP1wV7yBXRQ34xRVBqRJpiqfcwP2")
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log("ADMIN PROFILE NOT FOUND");
      return;
    }

    const doc = snapshot.docs[0];

    console.log("STAYNEXA ADMIN USER ID:");
    console.log(doc.id);

    console.log("PROFILE:");
    console.log(doc.data());
  } catch (error) {
    console.error("ERROR:", error);
  }
}

findAdmin();
