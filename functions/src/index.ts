import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {getMessaging} from "firebase-admin/messaging";

// Init Admin SDK
initializeApp();

setGlobalOptions({maxInstances: 10});

export const createVendorUser = onCall(
  {region: "me-central1", cors: true},
  async (request: CallableRequest) => {
    const {auth, data} = request;

    // 1️⃣ Auth required
    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    // 2️⃣ Super admin only
    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const {name, email, password} = data;

    // 3️⃣ Validate input
    if (!name || !email || !password) {
      throw new HttpsError(
        "invalid-argument",
        "name, email, and password are required"
      );
    }

    const authAdmin = getAuth();
    const db = getFirestore();

    // 4️⃣ Create Auth user
    const user = await authAdmin.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true, // optional since you're onboarding manually
    });

    // 6️⃣ Create vendor Firestore document
    await db.collection("vendors").doc(user.uid).set({
      name,
      email,
      createdAt: new Date(),
    });

    logger.info("Vendor created", {
      vendorId: user.uid,
    });

    return {
      uid: user.uid,
      success: true,
    };
  }
);

export const deleteVendorUser = onCall(
  {region: "me-central1", cors: true},
  async (request: CallableRequest) => {
    const {auth, data} = request;

    // 1️⃣ Auth required
    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    // 2️⃣ Super admin only
    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const {uid} = data;

    // 3️⃣ Validate input
    if (!uid) {
      throw new HttpsError(
        "invalid-argument",
        "vendor uid is required"
      );
    }

    const authAdmin = getAuth();
    const db = getFirestore();

    // 4️⃣ Delete Auth user
    try {
      await authAdmin.deleteUser(uid);
    } catch (error) {
      logger.error("Error deleting Auth user", {uid, error});
      // Continue to delete Firestore document even if Auth user is already gone
    }

    // 5️⃣ Delete vendor Firestore document
    await db.collection("vendors").doc(uid).delete();

    logger.info("Vendor deleted", {
      vendorId: uid,
    });

    return {
      success: true,
    };
  }
);

export const createStudentUser = onCall(
  {region: "me-central1", cors: true},
  async (request: CallableRequest) => {
    const {auth, data} = request;

    // 1️⃣ Auth required
    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    // 2️⃣ Super admin only
    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const {firstName, lastName, email, password, gender, dob, role} = data;

    // 3️⃣ Validate input
    if (!email) {
      throw new HttpsError(
        "invalid-argument",
        "email is required"
      );
    }

    const finalFirstName = firstName || "Student";
    const finalLastName = lastName || "";
    const finalRole = role || "student";
    const finalGender = gender || "Unspecified";
    const finalDob = dob || new Date().toISOString().split("T")[0];

    const authAdmin = getAuth();
    const db = getFirestore();

    // 4️⃣ Generate unique creator code if role is creator
    const generateCreatorCode = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let result = "";
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    let creatorCode = "";
    if (finalRole === "creator") {
      creatorCode = generateCreatorCode();
    }

    // 5️⃣ Create Auth user
    const userConfig: {
      email: string;
      displayName: string;
      emailVerified: boolean;
      password: string;
    } = {
      email,
      displayName: `${finalFirstName} ${finalLastName}`.trim(),
      emailVerified: true,
      password: password ||
        Math.random().toString(36).slice(-10) +
        Math.random().toString(36).slice(-10),
    };

    const user = await authAdmin.createUser(userConfig);

    // 6️⃣ Create student Firestore document
    const studentData: {
      firstName: string;
      lastName: string;
      email: string;
      gender: string;
      dob: string;
      uid: string;
      role: string;
      cashback: number;
      createdAt: Date;
      updatedAt: Date;
      creatorCode?: string;
      savings?: number;
    } = {
      firstName: finalFirstName,
      lastName: finalLastName,
      email,
      gender: finalGender,
      dob: finalDob,
      uid: user.uid,
      role: finalRole,
      cashback: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (finalRole === "creator") {
      studentData.creatorCode = creatorCode;
      studentData.savings = 0;
    }

    await db.collection("students").doc(user.uid).set(studentData);

    logger.info("Student created", {
      studentId: user.uid,
      role,
      creatorCode: creatorCode || "N/A",
    });

    return {
      uid: user.uid,
      creatorCode,
      success: true,
    };
  }
);

export const deleteStudentUser = onCall(
  {region: "me-central1", cors: true},
  async (request: CallableRequest) => {
    const {auth, data} = request;

    // 1️⃣ Auth required
    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    // 2️⃣ Super admin only
    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const {uid} = data;

    // 3️⃣ Validate input
    if (!uid) {
      throw new HttpsError(
        "invalid-argument",
        "student uid is required"
      );
    }

    const authAdmin = getAuth();
    const db = getFirestore();

    // 4️⃣ Delete Auth user
    try {
      await authAdmin.deleteUser(uid);
    } catch (error) {
      logger.error("Error deleting Auth user", {uid, error});
      // Delete Firestore docs even if Auth user is already gone
    }

    // 5️⃣ Delete student Firestore document
    await db.collection("students").doc(uid).delete();

    // 6️⃣ Delete related transactions
    const transactionsSnapshot = await db
      .collection("transactions")
      .where("userId", "==", uid)
      .get();

    const batch = db.batch();
    transactionsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    if (transactionsSnapshot.size > 0) {
      await batch.commit();
    }

    logger.info("Student deleted", {
      studentId: uid,
      transactionsDeleted: transactionsSnapshot.size,
    });

    return {
      success: true,
    };
  }
);

export const sendNotification = onCall(
  {region: "me-central1", cors: true},
  async (request: CallableRequest) => {
    const {auth, data} = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const {title, body, imageUrl, topic} = data;

    if (!title || !body || !topic) {
      throw new HttpsError(
        "invalid-argument",
        "title, body, and topic are required"
      );
    }

    const db = getFirestore();
    const messaging = getMessaging();

    const isValidUrl = (url: string) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    const notification: {title: string; body: string; imageUrl?: string} = {
      title,
      body,
    };
    if (imageUrl && isValidUrl(imageUrl)) {
      notification.imageUrl = imageUrl;
    }

    const message = {
      topic,
      notification,
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
      android: {
        notification: {
          sound: "default",
        },
      },
    };

    const messageId = await messaging.send(message);

    // Store notification record
    await db.collection("notifications").add({
      title,
      body,
      imageUrl: imageUrl || null,
      topic,
      sentBy: auth.uid,
      sentAt: new Date(),
      messageId,
    });

    logger.info("Notification sent", {
      title,
      topic,
      messageId,
    });

    return {
      success: true,
      messageId,
    };
  }
);
