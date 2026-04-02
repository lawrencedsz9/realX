import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";

// Init Admin SDK
initializeApp();

setGlobalOptions({maxInstances: 10});

export const createVendorUser = onCall(
  {region: "me-central1"},
  async (request: any) => {
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
  {region: "me-central1"},
  async (request: any) => {
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
  {region: "me-central1"},
  async (request: any) => {
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
    const userConfig: any = {
      email,
      displayName: `${finalFirstName} ${finalLastName}`.trim(),
      emailVerified: true,
    };

    if (password) {
      userConfig.password = password;
    } else {
      // Generate a random password for users created via admin panel with just
      // email
      userConfig.password =
        Math.random().toString(36).slice(-10) +
        Math.random().toString(36).slice(-10);
    }

    const user = await authAdmin.createUser(userConfig);

    // 6️⃣ Create student Firestore document
    const studentData: any = {
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
