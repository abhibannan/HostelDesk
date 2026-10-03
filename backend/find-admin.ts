import { db, firebaseAuth } from "./src/config/firebase.js";

async function findAdmin() {
  try {
    const email = "abhilashbannan@gmail.com";
    const password = "123456";

    let authUser;
    try {
      authUser = await firebaseAuth.getUserByEmail(email);
      await firebaseAuth.updateUser(authUser.uid, { password });
      console.log("Updated password for", email, "to:", password);
    } catch (e: any) {
      if (e?.code === "auth/user-not-found") {
        console.log("Creating Firebase Auth user for:", email);
        authUser = await firebaseAuth.createUser({
          email,
          password,
          displayName: "Abhi Bannan",
        });
        console.log("Created user with UID:", authUser.uid);
      } else {
        throw e;
      }
    }

    // Now ensure Firestore user record exists with role SUPER_ADMIN
    const userSnap = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    let firestoreUserId = authUser.uid;
    if (userSnap.empty) {
      console.log("Creating Firestore record for:", email);
      const userRef = db.collection("users").doc(authUser.uid);
      const now = new Date().toISOString();
      await userRef.set({
        id: authUser.uid,
        firebaseUid: authUser.uid,
        email,
        firstName: "Abhi",
        lastName: "Bannan",
        phone: null,
        profilePhotoUrl: null,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      });
      console.log("Created Firestore Super Admin profile!");
    } else {
      const doc = userSnap.docs[0];
      firestoreUserId = doc.id;
      await doc.ref.update({
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        firebaseUid: authUser.uid,
      });
      console.log("Updated existing Firestore record to SUPER_ADMIN:", doc.id);
    }

    const hostelsSnap = await db.collection("hostels").get();
    console.log("Found hostels:", hostelsSnap.size);
    for (const h of hostelsSnap.docs) {
      console.log("Hostel:", h.id, h.data().name);
      // Ensure staff record exists for this admin
      const staffSnap = await db
        .collection("hostelStaff")
        .where("hostelId", "==", h.id)
        .where("userId", "==", firestoreUserId)
        .get();

      if (staffSnap.empty) {
        const staffRef = db.collection("hostelStaff").doc();
        await staffRef.set({
          id: staffRef.id,
          hostelId: h.id,
          userId: firestoreUserId,
          role: "ADMIN",
          createdAt: new Date().toISOString(),
        });
        console.log(`Linked admin ${firestoreUserId} to hostel:`, h.id);
      } else {
        console.log(`Admin ${firestoreUserId} is already linked to hostel:`, h.id);
      }
    }
  } catch (error) {
    console.error("ERROR:", error);
  }
}

findAdmin().then(() => process.exit(0));
