import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {Expo} from "expo-server-sdk";
import {Resend} from "resend";
import {geohashForLocation} from "geofire-common";

// Init Admin SDK
initializeApp();

setGlobalOptions({maxInstances: 10});

const REGION = "me-central1";

// Fields to include in the maps/locations cache document
interface VendorMapEntry {
  name: string | null;
  nameAr: string | null;
  latitude: number;
  longitude: number;
  geohash: string;
  address: string | null;
  addressAr: string | null;
  mainCategory: string | null;
  profilePicture: string | null;
}

/**
 * Build a location entry from vendor data.
 * @param {FirebaseFirestore.DocumentData} data
 * @return {VendorMapEntry|null}
 */
function buildMapEntry(
  data: FirebaseFirestore.DocumentData,
): VendorMapEntry | null {
  const lat = data.latitude;
  const lng = data.longitude;
  if (
    typeof lat !== "number" || isNaN(lat) ||
    typeof lng !== "number" || isNaN(lng)
  ) {
    return null;
  }
  return {
    name: data.name || null,
    nameAr: data.nameAr || null,
    latitude: lat,
    longitude: lng,
    geohash: data.geohash || geohashForLocation([lat, lng]),
    address: data.address || null,
    addressAr: data.addressAr || null,
    mainCategory: data.mainCategory || null,
    profilePicture: data.profilePicture || null,
  };
}

// Helper: Generate unique 4-char creator code (2 letters + 2 digits)
const generateCreatorCode = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const pick = (chars: string) =>
    chars.charAt(Math.floor(Math.random() * chars.length));
  return pick(letters) + pick(letters) + pick(digits) + pick(digits);
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
  studentId?: string;
}

/**
 * Shared student creation logic
 * @param {CreateStudentInput} input - Student data
 * @return {Promise<{uid: string, creatorCode: string}>}
 */
async function doCreateStudentUser(input: CreateStudentInput) {
  const authAdmin = getAuth();
  const db = getFirestore();

  const {
    firstName, lastName, email, password, gender, dob, role, studentId,
  } = input;
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
    studentId?: string;
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

  if (studentId) {
    studentData.studentId = studentId;
  }

  await db.collection("students").doc(user.uid).set(studentData);

  // If creator, also create a document in creator_codes collection
  if (finalRole === "creator" && creatorCode) {
    await db.collection("creator_codes").doc(creatorCode).set({
      uid: user.uid,
      createdAt: new Date(),
    });
  }

  logger.info("Student created", {
    studentId: user.uid,
    role: finalRole,
    creatorCode: creatorCode || "N/A",
  });

  return {uid: user.uid, creatorCode};
}

export const createVendorUser = onCall(
  {region: REGION, cors: true},
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
      status: "Active",
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
  {region: REGION, cors: true},
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
  {region: REGION, cors: true},
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
  {region: REGION, cors: true},
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
  {region: REGION, cors: true, secrets: ["RESEND_API_KEY"]},
  async (request: CallableRequest) => {
    const {auth, data} = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const {verificationRequestId, firstName, lastName,
      gender, dob, role, studentId} = data;

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
      studentId: studentId || undefined,
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
        from: "realX <welcome@realx.qa>",
        to: email,
        subject: "Your realX Account is Ready!",
        html: [
          "<div style=\"font-family: Arial, sans-serif;",
          "  max-width: 600px; margin: 0 auto;\">",
          "  <h1 style=\"color: #16a34a;\">Welcome to RealX!</h1>",
          `  <p>Hi ${displayName},</p>`,
          "  <p>Your verification has been approved",
          "    and your RealX account is now ready.</p>",
          "  <p>You can log in using your email:",
          `    <strong>${email}</strong></p>`,
          "  <p style=\"margin-top: 24px;\">",
          "    Best regards,<br>The realX Team</p>",
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
  {region: REGION, cors: true},
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

export const deleteVerificationRequest = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const {auth, data} = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const {verificationRequestId} = data;

    if (!verificationRequestId) {
      throw new HttpsError(
        "invalid-argument",
        "verificationRequestId is required"
      );
    }

    const db = getFirestore();
    const bucket = getStorage().bucket();
    const reqDoc = db
      .collection("verification_requests")
      .doc(verificationRequestId);
    const requestSnap = await reqDoc.get();

    if (!requestSnap.exists) {
      throw new HttpsError("not-found", "Verification request not found");
    }

    const requestData = requestSnap.data();

    // Delete ID images from Storage
    const deleteFile = async (filePath: string) => {
      if (filePath) {
        try {
          await bucket.file(filePath).delete();
        } catch (err) {
          logger.warn("Failed to delete storage file", {filePath, error: err});
        }
      }
    };

    await Promise.all([
      deleteFile(requestData?.idFrontPath),
      deleteFile(requestData?.idBackPath),
    ]);

    // Delete the Firestore document
    await reqDoc.delete();

    logger.info("Verification request deleted", {verificationRequestId});

    return {success: true};
  }
);

export const sendNotification = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const {auth, data} = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const {title, body, imageUrl, topic} = data;

    if (!title || !body) {
      throw new HttpsError(
        "invalid-argument",
        "title and body are required"
      );
    }

    const db = getFirestore();
    const expo = new Expo();

    // Fetch all registered Expo push tokens
    const tokensSnapshot = await db.collection("pushTokens").get();
    const allTokens = tokensSnapshot.docs.map(
      (doc) => ({id: doc.id, token: doc.data().token as string})
    );

    if (allTokens.length === 0) {
      logger.info("No push tokens registered, skipping send");

      // Store notification record even if no tokens
      await db.collection("notifications").add({
        title,
        body,
        imageUrl: imageUrl || null,
        topic: topic || "all-users",
        sentBy: auth.uid,
        sentAt: new Date(),
        sentCount: 0,
        totalRegistered: 0,
      });

      return {success: true, sentCount: 0};
    }

    // Filter to valid Expo push tokens
    const validEntries = allTokens.filter((entry) =>
      Expo.isExpoPushToken(entry.token)
    );

    if (validEntries.length === 0) {
      logger.warn("No valid Expo push tokens found");
      return {success: true, sentCount: 0};
    }

    // Build push messages
    const messages = validEntries.map((entry) => ({
      to: entry.token,
      title,
      body,
      sound: "default" as const,
      data: {imageUrl: imageUrl || null},
    }));

    // Send in batches (SDK handles chunking automatically)
    const tickets = await expo.sendPushNotificationsAsync(messages);

    // Map token to Firestore doc ID for cleanup
    const tokenToDocId = new Map<string, string>();
    validEntries.forEach((entry) => {
      tokenToDocId.set(entry.token, entry.id);
    });

    // Handle errors and collect receipt IDs
    const invalidDocIds: string[] = [];
    const receiptIds: string[] = [];

    tickets.forEach((ticket, index) => {
      if (ticket.status === "error") {
        const details = ticket.details as {error?: string} | undefined;
        if (
          details?.error === "DeviceNotRegistered" ||
          details?.error === "InvalidCredentials"
        ) {
          const docId = tokenToDocId.get(validEntries[index].token);
          if (docId) invalidDocIds.push(docId);
        }
        logger.warn("Push ticket error", {
          token: validEntries[index].token,
          error: details,
        });
      } else if (ticket.id) {
        receiptIds.push(ticket.id);
      }
    });

    // Delete invalid tokens from Firestore
    if (invalidDocIds.length > 0) {
      const batch = db.batch();
      invalidDocIds.forEach((docId) => {
        batch.delete(db.collection("pushTokens").doc(docId));
      });
      await batch.commit();
      logger.info("Deleted invalid push tokens", {
        count: invalidDocIds.length,
      });
    }

    // Store notification record
    await db.collection("notifications").add({
      title,
      body,
      imageUrl: imageUrl || null,
      topic: topic || "all-users",
      sentBy: auth.uid,
      sentAt: new Date(),
      sentCount: validEntries.length,
      totalRegistered: allTokens.length,
      receiptIds,
    });

    logger.info("Notification sent", {
      title,
      sentCount: validEntries.length,
      totalRegistered: allTokens.length,
    });

    return {
      success: true,
      sentCount: validEntries.length,
    };
  }
);

export const registerPushToken = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const {auth, data} = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    const {token, platform} = data;

    if (!token || typeof token !== "string") {
      throw new HttpsError("invalid-argument", "token is required");
    }

    if (!Expo.isExpoPushToken(token)) {
      throw new HttpsError("invalid-argument", "Invalid Expo push token");
    }

    const db = getFirestore();
    const pushTokensRef = db.collection("pushTokens");

    // Check if this token already exists (deduplication)
    const existing = await pushTokensRef
      .where("token", "==", token)
      .limit(1)
      .get();

    if (!existing.empty) {
      // Update existing record with latest userId and platform
      await existing.docs[0].ref.update({
        userId: auth.uid,
        platform: platform || null,
        updatedAt: new Date(),
      });
      return {success: true, action: "updated"};
    }

    // Create new token record
    await pushTokensRef.add({
      token,
      userId: auth.uid,
      platform: platform || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info("Push token registered", {userId: auth.uid});

    return {success: true, action: "created"};
  }
);

export const syncVendorGeohash = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const {auth, data} = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const {vendorId} = data;

    if (!vendorId) {
      throw new HttpsError("invalid-argument", "vendorId is required");
    }

    const db = getFirestore();
    const vendorRef = db.collection("vendors").doc(vendorId);
    const vendorSnap = await vendorRef.get();

    if (!vendorSnap.exists) {
      throw new HttpsError("not-found", "Vendor not found");
    }

    const vendorData = vendorSnap.data();
    const lat = vendorData?.latitude;
    const lng = vendorData?.longitude;

    if (
      typeof lat === "number" && !isNaN(lat) &&
      typeof lng === "number" && !isNaN(lng)
    ) {
      const hash = geohashForLocation([lat, lng]);
      await vendorRef.update({geohash: hash});
      logger.info("Geohash synced", {vendorId, geohash: hash});
    } else {
      await vendorRef.update({geohash: FieldValue.delete()});
      logger.info("Geohash cleared", {vendorId});
    }

    return {success: true};
  }
);

export const backfillVendorGeohashes = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const {auth} = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const db = getFirestore();
    const snapshot = await db.collection("vendors").get();

    let updatedCount = 0;
    const BATCH_LIMIT = 500;
    let batch = db.batch();
    let batchCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const lat = data.latitude;
      const lng = data.longitude;

      if (
        typeof lat === "number" && !isNaN(lat) &&
        typeof lng === "number" && !isNaN(lng) &&
        !data.geohash
      ) {
        const hash = geohashForLocation([lat, lng]);
        batch.update(doc.ref, {geohash: hash});
        updatedCount++;
        batchCount++;

        if (batchCount >= BATCH_LIMIT) {
          batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
    });

    if (batchCount > 0) {
      await batch.commit();
    }

    logger.info("Geohash backfill complete", {updatedCount});

    return {success: true, updatedCount};
  }
);

/**
 * Firestore trigger: auto-sync maps/locations whenever a vendor doc changes.
 * Keeps a single cached document with all active vendor locations
 * keyed by vendorId.
 */
export const onVendorWrite = onDocumentWritten(
  {document: "vendors/{vendorId}", region: REGION},
  async (event) => {
    const vendorId = event.params.vendorId;
    const db = getFirestore();
    const locationsRef = db.collection("maps").doc("locations");

    // Vendor was deleted or has no data
    if (!event.data?.after?.exists) {
      await locationsRef.set(
        {[vendorId]: FieldValue.delete()},
        {merge: true},
      );
      logger.info("Removed vendor from locations cache", {vendorId});
      return;
    }

    const data = event.data.after.data();
    if (!data) return;
    const entry = buildMapEntry(data);

    if (entry) {
      await locationsRef.set(
        {[vendorId]: entry},
        {merge: true},
      );
      logger.info("Updated vendor in locations cache", {vendorId});
    } else {
      // Vendor exists but isn't mappable (inactive or no coordinates)
      await locationsRef.set(
        {[vendorId]: FieldValue.delete()},
        {merge: true},
      );
      logger.info("Removed unmappable vendor from locations cache", {vendorId});
    }
  },
);

/**
 * Admin callable: rebuild the entire maps/locations document from scratch.
 * Useful for initial seeding or fixing inconsistencies.
 */
export const rebuildLocationsCache = onCall(
  {region: REGION, cors: true},
  async (request: CallableRequest) => {
    const {auth} = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User not authenticated");
    }

    if (!auth.token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const db = getFirestore();
    const snapshot = await db.collection("vendors").get();

    const vendors: Record<string, VendorMapEntry> = {};
    let count = 0;

    snapshot.forEach((doc) => {
      const entry = buildMapEntry(doc.data());
      if (entry) {
        vendors[doc.id] = entry;
        count++;
      }
    });

    await db.collection("maps").doc("locations").set({vendors});

    logger.info("Locations cache rebuilt", {vendorCount: count});

    return {success: true, vendorCount: count};
  },
);
