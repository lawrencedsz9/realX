import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {getMessaging} from "firebase-admin/messaging";
import {Resend} from "resend";

// Init Admin SDK
initializeApp();

setGlobalOptions({maxInstances: 10});

// Helper: Generate unique 6-char creator code
const generateCreatorCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Shared student creation logic
interface CreateStudentInput {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  gender: string;
  dob: string;
  role: string;
}

/**
 * Shared student creation logic
 * @param {CreateStudentInput} input - Student data
 * @return {Promise<{uid: string, creatorCode: string}>}
 */
async function doCreateStudentUser(input: CreateStudentInput) {
  const authAdmin = getAuth();
  const db = getFirestore();

  const {firstName, lastName, email, password, gender, dob, role} = input;
  const finalFirstName = firstName || "Student";
  const finalLastName = lastName || "";
  const finalRole = role || "student";
  const finalGender = gender || "Unspecified";
  const finalDob = dob || new Date().toISOString().split("T")[0];

  let creatorCode = "";
  if (finalRole === "creator") {
    creatorCode = generateCreatorCode();
  }

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
    role: finalRole,
    creatorCode: creatorCode || "N/A",
  });

  return {uid: user.uid, creatorCode};
}

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

    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const {firstName, lastName, email, password, gender, dob, role} = data;

    if (!email) {
      throw new HttpsError("invalid-argument", "email is required");
    }

    const result = await doCreateStudentUser({
      firstName, lastName, email, password, gender, dob, role,
    });

    return {uid: result.uid, creatorCode: result.creatorCode, success: true};
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

export const approveVerificationRequest = onCall(
  {region: "me-central1", cors: true, secrets: ["RESEND_API_KEY"]},
  async (request: CallableRequest) => {
    const {auth, data} = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const {verificationRequestId, firstName, lastName,
      gender, dob, role} = data;

    if (!verificationRequestId) {
      throw new HttpsError(
        "invalid-argument",
        "verificationRequestId is required"
      );
    }

    const db = getFirestore();
    const reqDoc = db
      .collection("verification_requests")
      .doc(verificationRequestId);
    const requestSnap = await reqDoc.get();

    if (!requestSnap.exists) {
      throw new HttpsError("not-found", "Verification request not found");
    }

    const requestData = requestSnap.data();
    if (requestData?.status !== "pending") {
      throw new HttpsError(
        "failed-precondition",
        "Request has already been reviewed"
      );
    }

    const email = requestData.email;

    // Create student account
    const result = await doCreateStudentUser({
      firstName: firstName || "Student",
      lastName: lastName || "",
      email,
      password: undefined,
      gender: gender || "Unspecified",
      dob: dob || new Date().toISOString().split("T")[0],
      role: role || "student",
    });

    // Update verification request
    await reqDoc.update({
      status: "approved",
      reviewedAt: new Date(),
      reviewedBy: auth.uid,
      authUid: result.uid,
    });

    // Send welcome email via Resend
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const displayName = `${firstName || "Student"} ${lastName || ""}`.trim();

      await resend.emails.send({
        from: "RealX <welcome@realx.qa>",
        to: email,
        subject: "Your RealX Account is Ready!",
        html: [
          "<div style=\"font-family: Arial, sans-serif;",
          "  max-width: 600px; margin: 0 auto;\">",
          "  <h1 style=\"color: #16a34a;\">Welcome to RealX!</h1>",
          `  <p>Hi ${displayName},</p>`,
          "  <p>Your verification has been approved",
          "    and your RealX account is now ready.</p>",
          "  <p>You can log in using your email:",
          `    <strong>${email}</strong></p>`,
          "  <p>A secure password has been generated for you.",
          "    Please use the \"Forgot Password\" option",
          "    on the login screen to set your own password.</p>",
          "  <p style=\"margin-top: 24px;\">",
          "    Best regards,<br>The RealX Team</p>",
          "</div>",
        ].join("\n"),
      });
      logger.info("Welcome email sent", {email});
    } catch (emailError) {
      logger.error("Failed to send welcome email", {email, error: emailError});
      // Don't fail the whole operation if email fails
    }

    logger.info("Verification request approved", {
      verificationRequestId,
      studentUid: result.uid,
    });

    return {
      uid: result.uid,
      creatorCode: result.creatorCode,
      success: true,
    };
  }
);

export const rejectVerificationRequest = onCall(
  {region: "me-central1", cors: true},
  async (request: CallableRequest) => {
    const {auth, data} = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const {verificationRequestId, rejectionReason} = data;

    if (!verificationRequestId) {
      throw new HttpsError(
        "invalid-argument",
        "verificationRequestId is required"
      );
    }

    if (!rejectionReason) {
      throw new HttpsError(
        "invalid-argument",
        "rejectionReason is required"
      );
    }

    const db = getFirestore();
    const reqDoc = db
      .collection("verification_requests")
      .doc(verificationRequestId);
    const requestSnap = await reqDoc.get();

    if (!requestSnap.exists) {
      throw new HttpsError("not-found", "Verification request not found");
    }

    const requestData = requestSnap.data();
    if (requestData?.status !== "pending") {
      throw new HttpsError(
        "failed-precondition",
        "Request has already been reviewed"
      );
    }

    await reqDoc.update({
      status: "rejected",
      rejectionReason,
      reviewedAt: new Date(),
      reviewedBy: auth.uid,
    });

    logger.info("Verification request rejected", {verificationRequestId});

    return {success: true};
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
