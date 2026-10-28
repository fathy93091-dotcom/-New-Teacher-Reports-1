import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import {
  initializeFirestore,
  memoryLocalCache,
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  writeBatch,
  updateDoc,
  arrayUnion,
  deleteField,
  DocumentSnapshot,
  setLogLevel,
  onSnapshot
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { GoStarsBackupData, GeneratedReport, Student, AttendanceRecord, deduplicateReportsList, areReportsDuplicate } from "../types";
import { mergeEntityLists } from "./storage";

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Initialize Firestore Database with in-memory local cache to prevent iframe IndexedDB corruption
const configuredDatabaseId = (firebaseConfig as any).firestoreDatabaseId;
export const db = configuredDatabaseId
  ? initializeFirestore(app, { localCache: memoryLocalCache() }, configuredDatabaseId)
  : initializeFirestore(app, { localCache: memoryLocalCache() });

try {
  setLogLevel("silent");
} catch {}

// Circuit breaker for Firestore quota limit
const QUOTA_STORAGE_KEY = "gostars_firestore_quota_cooldown";
let quotaExceededCooldownUntil = 0;

// Clear any stale local quota key from prior sessions to restore live cloud connectivity
if (typeof localStorage !== "undefined") {
  try {
    localStorage.removeItem(QUOTA_STORAGE_KEY);
  } catch {}
}

export function isFirestoreQuotaExceeded(): boolean {
  return quotaExceededCooldownUntil > Date.now();
}

export function setFirestoreQuotaExceededCooldown(durationMs = 3 * 60 * 1000) {
  quotaExceededCooldownUntil = Date.now() + durationMs;
  console.info(`[GoStars Firebase] Free daily quota limit reached. Safely operating in offline local mode until ${new Date(quotaExceededCooldownUntil).toLocaleTimeString()}.`);
}

export function resetFirestoreQuotaCooldown() {
  quotaExceededCooldownUntil = 0;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(QUOTA_STORAGE_KEY);
    } catch {}
  }
}

function isQuotaError(err: any): boolean {
  if (!err) return false;
  const code = err.code;
  const msg = err.message || String(err);
  return (
    code === "resource-exhausted" ||
    msg.includes("Quota limit exceeded") ||
    msg.includes("resource-exhausted") ||
    msg.includes("Free daily write units") ||
    msg.includes("quota metric")
  );
}

/**
 * Validate Connection to Firestore safely without throwing unhandled network drops
 */
export async function testConnection(): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, "test", "connection"));
    return snap.exists() || true;
  } catch (error: any) {
    if (isQuotaError(error)) {
      setFirestoreQuotaExceededCooldown();
    }
    return false;
  }
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write"
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  return errInfo;
}

// Google Sign-In
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Firebase Google Auth error:", error);
    throw error;
  }
}

// Sign Out
export async function logoutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error logging out:", error);
  }
}

/**
 * UTF-8 byte budget checker for any document (Target safe ceiling: 650 KB)
 */
export function getPayloadByteSize(data: any): number {
  try {
    const json = JSON.stringify(data);
    return new TextEncoder().encode(json).length;
  } catch {
    return 0;
  }
}

const MAX_SAFE_DOC_BYTES = 650 * 1024; // 650 KB

/**
 * Sanitize entity payload for Firestore:
 * - Drops non-serializable fields & raw binaries
 * - Trims redundant inline reports inside attendance records
 * - Enforces dynamic payload budget
 */
export function cleanEntityPayload<T>(data: T): any {
  if (data === null || data === undefined) return null;
  const raw = JSON.parse(
    JSON.stringify(data, (_, value) => (value === undefined ? null : value))
  );

  const sanitizeObject = (obj: any, depth = 0): void => {
    if (!obj || typeof obj !== "object" || depth > 8) return;
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (Array.isArray(obj[i])) {
          obj[i] = obj[i].map((sub: any) => (typeof sub === "object" ? sub : String(sub)));
        }
        sanitizeObject(obj[i], depth + 1);
      }
      return;
    }
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === "string") {
        if (
          val.startsWith("data:") ||
          (key.toLowerCase().includes("avatar") && val.length > 5000) ||
          (key.toLowerCase().includes("image") && val.length > 5000) ||
          (val.length > 10000 && /^[A-Za-z0-9+/=\s]+$/.test(val.slice(0, 100)))
        ) {
          obj[key] = "";
        }
      } else if (typeof val === "object" && val !== null) {
        if (key === "attachment" || key === "attachments" || key === "media") {
          delete (val as any).data;
          delete (val as any).previewUrl;
          delete (val as any).base64;
        }
        sanitizeObject(val, depth + 1);
      }
    }
  };

  // Ensure report text and generated text are synchronized and preserved
  if (raw && typeof raw === "object") {
    if (!raw.reportText && raw.generatedText) {
      raw.reportText = raw.generatedText;
    }
    if (!raw.generatedText && raw.reportText) {
      raw.generatedText = raw.reportText;
    }
  }

  return raw;
}

/**
 * Save an individual entity record to a user subcollection
 * Path: users/{userId}/{subcollectionName}/{itemId}
 */
export async function saveSubcollectionRecord(
  userId: string,
  subcollectionName: string,
  itemId: string | number,
  data: any
): Promise<void> {
  if (!userId || isFirestoreQuotaExceeded() || itemId === undefined || itemId === null || String(itemId).trim() === "") return;

  const safeDocId = String(itemId).replace(/\//g, "_").trim();
  const rawCleanId = String(itemId).trim();
  const path = `users/${userId}/${subcollectionName}/${safeDocId}`;

  // If writing to students subcollection, verify student is NOT tombstoned or marked deleted
  if (subcollectionName === "students") {
    let isTombstoned = false;
    try {
      const tombstoneKeys = [
        `gostars_${userId}_deleted_student_ids`,
        `gostars_tombstones_${userId}`,
        "gostars_guest_deleted_student_ids",
        "gostars_tombstones"
      ];
      for (const k of tombstoneKeys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr) && (arr.includes(safeDocId) || arr.includes(rawCleanId))) {
            isTombstoned = true;
            break;
          }
        }
      }
    } catch {}

    if (isTombstoned) {
      // If student is tombstoned, delete any lingering doc and NEVER write it!
      const itemDocRef = doc(db, "users", userId, subcollectionName, safeDocId);
      await deleteDoc(itemDocRef).catch(() => {});
      return;
    }
  }

  try {
    const itemDocRef = doc(db, "users", userId, subcollectionName, safeDocId);
    const cleaned = cleanEntityPayload(data);

    const enriched = {
      ...(cleaned || {}),
      id: safeDocId,
      userId,
      updatedAt: cleaned?.updatedAt || new Date().toISOString(),
      syncVersion: (cleaned?.syncVersion || 0) + 1
    };

    // Verify document size is safely under budget
    const byteSize = getPayloadByteSize(enriched);
    if (byteSize > MAX_SAFE_DOC_BYTES) {
      console.warn(`[GoStars Firebase] Document ${path} exceeds 650KB (${byteSize} bytes). Slicing large texts.`);
      if (enriched.reportText && typeof enriched.reportText === "string" && enriched.reportText.length > 50000) {
        enriched.reportText = enriched.reportText.slice(0, 50000);
      }
    }

    await setDoc(itemDocRef, enriched, { merge: true });
    resetFirestoreQuotaCooldown();
  } catch (err: any) {
    if (isQuotaError(err)) {
      setFirestoreQuotaExceededCooldown();
      console.warn("[GoStars Firebase] Quota limit encountered during subcollection write.");
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

/**
 * Delete an individual record from a user subcollection
 */
export async function deleteSubcollectionRecord(
  userId: string,
  subcollectionName: string,
  itemId: string | number
): Promise<void> {
  if (!userId || isFirestoreQuotaExceeded() || itemId === undefined || itemId === null || String(itemId).trim() === "") return;

  const safeDocId = String(itemId).replace(/\//g, "_").trim();
  const path = `users/${userId}/${subcollectionName}/${safeDocId}`;

  try {
    const itemDocRef = doc(db, "users", userId, subcollectionName, safeDocId);
    await deleteDoc(itemDocRef);
    resetFirestoreQuotaCooldown();
  } catch (err: any) {
    if (isQuotaError(err)) {
      setFirestoreQuotaExceededCooldown();
      return;
    }
    handleFirestoreError(err, OperationType.DELETE, path);
    throw err;
  }
}

/**
 * Permanently and completely deletes a student from Firestore:
 * 1. Deletes the student document from users/{userId}/students/{studentId}
 * 2. Records the studentId in users/{userId}.deletedStudentIds so it can NEVER be resurrected
 * 3. Cleans any legacy monolithic students array in users/{userId}
 * 4. Deletes all associated records in Firestore (attendance, reports, exams, payments, privateLessons)
 * 5. Removes studentId from group memberships in users/{userId}/groups and combinedGroups
 */
export async function deleteStudentPermanentlyFromFirestore(
  userId: string,
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId || !studentId) {
    return { success: false, error: "Missing userId or studentId" };
  }

  const safeDocId = String(studentId).replace(/\//g, "_").trim();
  if (!safeDocId) return { success: true };

  try {
    // 1. Delete student subcollection document
    const studentDocRef = doc(db, "users", userId, "students", safeDocId);
    await deleteDoc(studentDocRef);

    // 2. Mark permanently in root document's deletedStudentIds & remove from legacy monolithic arrays
    const rootDocRef = doc(db, "users", userId);
    try {
      const rootSnap = await getDoc(rootDocRef);
      if (rootSnap.exists()) {
        const rootData = rootSnap.data() || {};
        const updates: Record<string, any> = {
          deletedStudentIds: arrayUnion(safeDocId),
          updatedAt: new Date().toISOString()
        };
        // Clean from legacy monolithic students array if present
        if (Array.isArray(rootData.students)) {
          updates.students = rootData.students.filter((s: any) => s && String(s.id).replace(/\//g, "_").trim() !== safeDocId);
        }
        await updateDoc(rootDocRef, updates);
      } else {
        await setDoc(rootDocRef, {
          deletedStudentIds: arrayUnion(safeDocId),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch {
      await setDoc(rootDocRef, {
        deletedStudentIds: arrayUnion(safeDocId),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }

    // 3. Clean linked records in background batches
    const linkedSubcollections = ["attendance", "reports", "exams", "payments", "privateLessons"];
    for (const subcol of linkedSubcollections) {
      try {
        const q = query(collection(db, "users", userId, subcol), where("studentId", "==", safeDocId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (subErr) {
        console.debug(`[GoStars Firebase] Note cleaning linked ${subcol} for deleted student:`, subErr);
      }
    }

    // 4. Clean student from groups and combinedGroups
    try {
      const groupsSnap = await getDocs(collection(db, "users", userId, "groups"));
      if (!groupsSnap.empty) {
        const batch = writeBatch(db);
        let groupModified = false;
        groupsSnap.docs.forEach(d => {
          const gData = d.data();
          if (Array.isArray(gData.studentIds) && gData.studentIds.includes(safeDocId)) {
            batch.update(d.ref, {
              studentIds: gData.studentIds.filter((id: string) => id !== safeDocId)
            });
            groupModified = true;
          }
        });
        if (groupModified) await batch.commit();
      }
    } catch {}

    try {
      const cgSnap = await getDocs(collection(db, "users", userId, "combinedGroups"));
      if (!cgSnap.empty) {
        const batch = writeBatch(db);
        let cgModified = false;
        cgSnap.docs.forEach(d => {
          const cgData = d.data();
          if (Array.isArray(cgData.studentIds) && cgData.studentIds.includes(safeDocId)) {
            batch.update(d.ref, {
              studentIds: cgData.studentIds.filter((id: string) => id !== safeDocId)
            });
            cgModified = true;
          }
        });
        if (cgModified) await batch.commit();
      }
    } catch {}

    resetFirestoreQuotaCooldown();
    console.info(`[GoStars Firebase] Student ${safeDocId} permanently deleted from cloud.`);
    return { success: true };
  } catch (err: any) {
    if (isQuotaError(err)) {
      setFirestoreQuotaExceededCooldown();
      return { success: false, error: "Quota limit exceeded" };
    }
    console.error(`[GoStars Firebase] Failed to permanently delete student ${safeDocId}:`, err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Fast batched writes for multiple queued subcollection records in a single round-trip
 */
export async function batchWriteSubcollectionRecords(
  userId: string,
  records: Array<{
    subcollection: string;
    itemId: string | number;
    operation: "create" | "update" | "delete";
    payload?: any;
  }>
): Promise<{ success: boolean; error?: string }> {
  if (!userId || isFirestoreQuotaExceeded() || !records || records.length === 0) {
    return { success: true };
  }

  try {
    const batch = writeBatch(db);
    for (const rec of records) {
      if (rec.itemId === undefined || rec.itemId === null || String(rec.itemId).trim() === "") continue;
      const safeDocId = String(rec.itemId).replace(/\//g, "_").trim();
      const docRef = doc(db, "users", userId, rec.subcollection, safeDocId);

      if (rec.operation === "delete") {
        batch.delete(docRef);
        if (rec.subcollection === "students") {
          const rootDocRef = doc(db, "users", userId);
          batch.set(rootDocRef, {
            deletedStudentIds: arrayUnion(safeDocId),
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } else {
        const cleaned = cleanEntityPayload(rec.payload);
        const enriched = {
          ...(cleaned || {}),
          id: safeDocId,
          userId,
          updatedAt: cleaned?.updatedAt || new Date().toISOString(),
          syncVersion: (cleaned?.syncVersion || 0) + 1
        };
        batch.set(docRef, enriched, { merge: true });
      }
    }

    await batch.commit();
    resetFirestoreQuotaCooldown();
    return { success: true };
  } catch (err: any) {
    if (isQuotaError(err)) {
      setFirestoreQuotaExceededCooldown();
      return { success: false, error: "Quota limit exceeded" };
    }
    console.warn("[GoStars Firebase] Batch subcollection write note:", err?.message || err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Fetch all items from a subcollection safely using one-shot server query
 */
export async function fetchAllSubcollectionRecords<T extends { id?: string | number }>(
  userId: string,
  subcollectionName: string
): Promise<T[]> {
  if (!userId || isFirestoreQuotaExceeded()) return [];

  const path = `users/${userId}/${subcollectionName}`;
  const allItems: T[] = [];

  try {
    const colRef = collection(db, "users", userId, subcollectionName);
    const snap = await getDocs(colRef);

    if (!snap || snap.empty) {
      return [];
    }

    snap.forEach((d: any) => {
      if (d.exists()) {
        const rawData = d.data() || {};
        const docId = d.id;
        const item = { ...rawData, id: rawData.id !== undefined && rawData.id !== null ? rawData.id : docId } as T;
        // Ignore tombstones or deleted items
        if (item && item.id !== undefined && item.id !== null && !(item as any).deletedAt) {
          allItems.push(item);
        }
      }
    });

    return allItems;
  } catch (err: any) {
    if (isQuotaError(err)) {
      setFirestoreQuotaExceededCooldown();
      return [];
    }
    console.warn(`[GoStars Firebase] Non-fatal subcollection fetch note [${path}]:`, err?.message || err);
    return [];
  }
}

/**
 * Fetch entire normalized user workspace from Cloud Firestore:
 * 1. Checks subcollections for students, reports, attendance, etc.
 * 2. Checks if legacy monolithic doc exists; if so, performs automatic non-destructive migration!
 */
export async function fetchFullUserWorkspaceFromFirestore(
  userId: string
): Promise<GoStarsBackupData | null> {
  if (!userId || isFirestoreQuotaExceeded()) return null;

  try {
    // 1. Fetch subcollections in parallel using Promise.all for high speed
    const [
      students,
      reports,
      attendanceRecords,
      lessons,
      paymentTransactions,
      groups,
      privateLessons,
      combinedStudentGroups,
      examRecords,
      settingsList
    ] = await Promise.all([
      fetchAllSubcollectionRecords<Student>(userId, "students"),
      fetchAllSubcollectionRecords<GeneratedReport>(userId, "reports"),
      fetchAllSubcollectionRecords<AttendanceRecord>(userId, "attendance"),
      fetchAllSubcollectionRecords<any>(userId, "lessons"),
      fetchAllSubcollectionRecords<any>(userId, "payments"),
      fetchAllSubcollectionRecords<any>(userId, "groups"),
      fetchAllSubcollectionRecords<any>(userId, "privateLessons"),
      fetchAllSubcollectionRecords<any>(userId, "combinedGroups"),
      fetchAllSubcollectionRecords<any>(userId, "exams"),
      fetchAllSubcollectionRecords<any>(userId, "settings")
    ]);

    const hasSubcollectionData =
      students.length > 0 ||
      reports.length > 0 ||
      attendanceRecords.length > 0 ||
      groups.length > 0 ||
      lessons.length > 0 ||
      paymentTransactions.length > 0;

    // 2. Check root user document for legacy data or metadata
    const userDocRef = doc(db, "users", userId);
    let userDocSnap: any = null;
    try {
      userDocSnap = await getDoc(userDocRef);
    } catch {}

    let legacyData: any = null;
    if (userDocSnap && userDocSnap.exists()) {
      legacyData = userDocSnap.data();
    }

    // 3. If legacy monolithic data exists and has arrays, merge and migrate them!
    if (legacyData && (Array.isArray(legacyData.students) || Array.isArray(legacyData.reports))) {
      console.info("[GoStars Firebase] Migrating legacy monolithic user document to normalized subcollections...");
      await migrateLegacyMonolithicDocumentToSubcollections(userId, legacyData);
    }

    const effectiveSettings =
      settingsList.length > 0
        ? settingsList[0]
        : (legacyData?.settings || null);

    if (!hasSubcollectionData && !legacyData) {
      return null;
    }

    const deletedStudentIds: string[] = Array.isArray(legacyData?.deletedStudentIds)
      ? legacyData.deletedStudentIds.map((id: any) => String(id).trim()).filter(Boolean)
      : [];
    const deletedIdsSet = new Set(deletedStudentIds);

    // Also include local tombstones from all scoped and legacy keys
    try {
      const tombstoneKeys = [
        `gostars_${userId}_deleted_student_ids`,
        `gostars_tombstones_${userId}`,
        "gostars_guest_deleted_student_ids",
        "gostars_tombstones"
      ];
      for (const k of tombstoneKeys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((id: string) => {
              if (id) {
                const clean = String(id).replace(/\//g, "_").trim();
                if (!deletedIdsSet.has(clean)) {
                  deletedStudentIds.push(clean);
                  deletedIdsSet.add(clean);
                }
              }
            });
          }
        }
      }
    } catch {}

    // Clean any zombie student docs in subcollection
    students.forEach(s => {
      if (s && s.id && deletedIdsSet.has(String(s.id).replace(/\//g, "_").trim())) {
        const deadRef = doc(db, "users", userId, "students", String(s.id).replace(/\//g, "_").trim());
        deleteDoc(deadRef).catch(() => {});
      }
    });

    // Combine any legacy items not yet in subcollections, strictly excluding deleted students
    const activeSubcolStudents = students.filter(s => s && s.id && !deletedIdsSet.has(String(s.id).trim()));
    const activeLegacyStudents = (legacyData?.students || []).filter((s: any) => s && s.id && !deletedIdsSet.has(String(s.id).trim()));
    const mergedStudents = activeSubcolStudents.length > 0 ? activeSubcolStudents : activeLegacyStudents;
    const mergedReports = reports.length > 0 ? reports : (legacyData?.reports || []);
    const mergedAttendance = attendanceRecords.length > 0 ? attendanceRecords : (legacyData?.attendanceRecords || []);
    const mergedLessons = lessons.length > 0 ? lessons : (legacyData?.lessons || []);
    const mergedPayments = paymentTransactions.length > 0 ? paymentTransactions : (legacyData?.paymentTransactions || []);
    const mergedGroups = groups.length > 0 ? groups : (legacyData?.groups || []);
    const mergedPrivate = privateLessons.length > 0 ? privateLessons : (legacyData?.privateLessons || []);
    const mergedCombined = combinedStudentGroups.length > 0 ? combinedStudentGroups : (legacyData?.combinedStudentGroups || []);
    const mergedExams = examRecords.length > 0 ? examRecords : (legacyData?.examRecords || []);

    const workspace: GoStarsBackupData = {
      version: "2.0",
      exportedAt: new Date().toISOString(),
      settings: effectiveSettings,
      students: mergedStudents,
      reports: mergedReports,
      attendanceRecords: mergedAttendance,
      lessons: mergedLessons,
      paymentTransactions: mergedPayments,
      groups: mergedGroups,
      privateLessons: mergedPrivate,
      combinedStudentGroups: mergedCombined,
      examRecords: mergedExams,
      deletedStudentIds
    };

    return workspace;
  } catch (err: any) {
    console.error("[GoStars Firebase] Error fetching full user workspace:", err);
    return null;
  }
}

/**
 * Non-destructive migration of legacy monolithic doc into normalized subcollections
 */
export async function migrateLegacyMonolithicDocumentToSubcollections(
  userId: string,
  legacyData: any
): Promise<void> {
  if (!userId || !legacyData) return;

  try {
    const deletedStudentIds: string[] = Array.isArray(legacyData?.deletedStudentIds)
      ? legacyData.deletedStudentIds.map((id: any) => String(id).trim()).filter(Boolean)
      : [];
    const deletedIdsSet = new Set(deletedStudentIds);

    const batchSize = 250;
    let batch = writeBatch(db);
    let opCount = 0;

    const commitBatchIfNeeded = async () => {
      if (opCount >= batchSize) {
        await batch.commit();
        batch = writeBatch(db);
        opCount = 0;
      }
    };

    const addEntitiesToBatch = async (subcollection: string, items: any[]) => {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        if (!item) continue;
        const id = item.id || `migrated_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const safeDocId = String(id).replace(/\//g, "_").trim();
        if (subcollection === "students" && deletedIdsSet.has(safeDocId)) {
          continue; // NEVER migrate a deleted student
        }
        const docRef = doc(db, "users", userId, subcollection, safeDocId);
        const cleaned = cleanEntityPayload(item);
        batch.set(docRef, { ...cleaned, id: safeDocId, userId, migratedAt: new Date().toISOString() }, { merge: true });
        opCount++;
        await commitBatchIfNeeded();
      }
    };

    if (Array.isArray(legacyData.students)) await addEntitiesToBatch("students", legacyData.students);
    if (Array.isArray(legacyData.reports)) await addEntitiesToBatch("reports", legacyData.reports);
    if (Array.isArray(legacyData.attendanceRecords)) await addEntitiesToBatch("attendance", legacyData.attendanceRecords);
    if (Array.isArray(legacyData.lessons)) await addEntitiesToBatch("lessons", legacyData.lessons);
    if (Array.isArray(legacyData.paymentTransactions)) await addEntitiesToBatch("payments", legacyData.paymentTransactions);
    if (Array.isArray(legacyData.groups)) await addEntitiesToBatch("groups", legacyData.groups);
    if (Array.isArray(legacyData.privateLessons)) await addEntitiesToBatch("privateLessons", legacyData.privateLessons);
    if (Array.isArray(legacyData.combinedStudentGroups)) await addEntitiesToBatch("combinedGroups", legacyData.combinedStudentGroups);
    if (Array.isArray(legacyData.examRecords)) await addEntitiesToBatch("exams", legacyData.examRecords);
    if (legacyData.settings) {
      const settingsRef = doc(db, "users", userId, "settings", "appSettings");
      batch.set(settingsRef, { ...cleanEntityPayload(legacyData.settings), id: "appSettings", userId }, { merge: true });
      opCount++;
    }

    if (opCount > 0) {
      await batch.commit();
    }

    // Clean legacy monolithic arrays from the root document so they never re-migrate or resurrect deleted records
    const userDocRef = doc(db, "users", userId);
    try {
      await updateDoc(userDocRef, {
        students: deleteField(),
        reports: deleteField(),
        attendanceRecords: deleteField(),
        lessons: deleteField(),
        paymentTransactions: deleteField(),
        groups: deleteField(),
        privateLessons: deleteField(),
        combinedStudentGroups: deleteField(),
        examRecords: deleteField(),
        schemaVersion: 2,
        migratedToSubcollectionsAt: new Date().toISOString(),
        lastSyncDevice: typeof navigator !== "undefined" ? navigator.userAgent : "web"
      });
    } catch {
      await setDoc(userDocRef, {
        userId,
        schemaVersion: 2,
        migratedToSubcollectionsAt: new Date().toISOString(),
        lastSyncDevice: typeof navigator !== "undefined" ? navigator.userAgent : "web"
      }, { merge: true });
    }

    console.info("[GoStars Firebase] Migration to normalized subcollections completed successfully.");
  } catch (err) {
    console.warn("[GoStars Firebase] Non-fatal migration note:", err);
  }
}

/**
 * Save full workspace to Firestore normalized subcollections via batched writes
 */
export async function saveUserDataToFirestore(
  userId: string,
  data: GoStarsBackupData,
  _force = false
): Promise<{ success: boolean; error?: string; timestamp?: string; quotaExceeded?: boolean }> {
  if (!userId) {
    return { success: false, error: "No user authenticated" };
  }

  if (isFirestoreQuotaExceeded()) {
    return { success: true, timestamp: new Date().toISOString(), quotaExceeded: true };
  }

  try {
    // Gather all local and remote tombstones
    const allDeletedIds = new Set<string>();
    if (Array.isArray(data.deletedStudentIds)) {
      data.deletedStudentIds.forEach(id => {
        if (id) allDeletedIds.add(String(id).replace(/\//g, "_").trim());
      });
    }
    try {
      const tombstoneKeys = [
        `gostars_${userId}_deleted_student_ids`,
        `gostars_tombstones_${userId}`,
        "gostars_guest_deleted_student_ids",
        "gostars_tombstones"
      ];
      for (const k of tombstoneKeys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((id: string) => {
              if (id) allDeletedIds.add(String(id).replace(/\//g, "_").trim());
            });
          }
        }
      }
    } catch {}

    const batchSize = 300;
    let batch = writeBatch(db);
    let opCount = 0;

    const commitBatchIfNeeded = async () => {
      if (opCount >= batchSize) {
        await batch.commit();
        batch = writeBatch(db);
        opCount = 0;
      }
    };

    const addListToBatch = async (subcollection: string, items: any[]) => {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        if (!item || item.id === undefined || item.id === null || !String(item.id).trim()) continue;
        const safeDocId = String(item.id).replace(/\//g, "_").trim();

        // STRICT CHECK: If saving students, NEVER write a tombstoned student!
        if (subcollection === "students" && allDeletedIds.has(safeDocId)) {
          continue;
        }

        const docRef = doc(db, "users", userId, subcollection, safeDocId);
        const cleaned = cleanEntityPayload(item);
        batch.set(
          docRef,
          {
            ...(cleaned || {}),
            id: safeDocId,
            userId,
            updatedAt: cleaned?.updatedAt || new Date().toISOString()
          },
          { merge: true }
        );
        opCount++;
        await commitBatchIfNeeded();
      }
    };

    // Explicitly delete any student docs in cloud that match tombstones
    for (const delId of allDeletedIds) {
      if (!delId) continue;
      const deadRef = doc(db, "users", userId, "students", delId);
      batch.delete(deadRef);
      opCount++;
      await commitBatchIfNeeded();
    }

    const cleanStudents = (data.students || []).filter(s => s && s.id && !allDeletedIds.has(String(s.id).replace(/\//g, "_").trim()));

    await addListToBatch("students", cleanStudents);
    await addListToBatch("reports", data.reports || []);
    await addListToBatch("attendance", data.attendanceRecords || []);
    await addListToBatch("lessons", data.lessons || []);
    await addListToBatch("payments", data.paymentTransactions || []);
    await addListToBatch("groups", data.groups || []);
    await addListToBatch("privateLessons", data.privateLessons || []);
    await addListToBatch("combinedGroups", data.combinedStudentGroups || []);
    await addListToBatch("exams", data.examRecords || []);

    if (data.settings) {
      const settingsRef = doc(db, "users", userId, "settings", "appSettings");
      batch.set(
        settingsRef,
        { ...(cleanEntityPayload(data.settings) || {}), id: "appSettings", userId },
        { merge: true }
      );
      opCount++;
      await commitBatchIfNeeded();
    }

    // Update root user metadata document and persist deletedStudentIds
    const rootDocRef = doc(db, "users", userId);
    const deletedArr = Array.from(allDeletedIds);
    batch.set(rootDocRef, {
      userId,
      schemaVersion: 2,
      updatedAt: new Date().toISOString(),
      ...(deletedArr.length > 0 ? { deletedStudentIds: arrayUnion(...deletedArr) } : {}),
      summaryCounts: {
        studentsCount: cleanStudents.length,
        reportsCount: data.reports?.length || 0,
        attendanceCount: data.attendanceRecords?.length || 0,
        lessonsCount: data.lessons?.length || 0,
        paymentsCount: data.paymentTransactions?.length || 0
      }
    }, { merge: true });
    opCount++;

    if (opCount > 0) {
      await batch.commit();
    }

    resetFirestoreQuotaCooldown();
    return { success: true, timestamp: new Date().toISOString() };
  } catch (err: any) {
    if (isQuotaError(err)) {
      setFirestoreQuotaExceededCooldown();
      console.warn("[GoStars Firebase] Quota limit encountered during workspace save. Data safely stored locally.");
      return { success: true, timestamp: new Date().toISOString(), quotaExceeded: true };
    }
    console.error("[GoStars Firebase] Error saving workspace to Firestore:", err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Legacy compatibility alias for single-document subscribe
 */
export function subscribeToUserData(
  userId: string,
  onData: (data: GoStarsBackupData | null, metadata: { fromCache: boolean; hasPendingWrites: boolean }) => void,
  _onError?: (error: Error) => void
): () => void {
  if (!userId || isFirestoreQuotaExceeded()) return () => {};

  let isCancelled = false;

  // Initial fetch from normalized collections
  fetchFullUserWorkspaceFromFirestore(userId).then(workspace => {
    if (!isCancelled) {
      onData(workspace, { fromCache: false, hasPendingWrites: false });
    }
  }).catch((err) => {
    if (isQuotaError(err)) {
      setFirestoreQuotaExceededCooldown();
    }
    if (_onError) {
      _onError(err);
    }
  });

  let lastFetchTime = Date.now();
  const safeFetchWorkspace = () => {
    if (isCancelled || !navigator.onLine || isFirestoreQuotaExceeded()) return;
    const now = Date.now();
    if (now - lastFetchTime < 30000) return; // At most once every 30s
    lastFetchTime = now;

    fetchFullUserWorkspaceFromFirestore(userId).then(workspace => {
      if (!isCancelled) {
        onData(workspace, { fromCache: false, hasPendingWrites: false });
      }
    }).catch((err) => {
      if (isQuotaError(err)) {
        setFirestoreQuotaExceededCooldown();
      }
      if (_onError) {
        _onError(err);
      }
    });
  };

  // Poll / refresh interval for multi-device sync (every 60s)
  const pollInterval = setInterval(() => {
    safeFetchWorkspace();
  }, 60000);

  if (typeof window !== "undefined") {
    window.addEventListener("focus", safeFetchWorkspace);
    window.addEventListener("online", safeFetchWorkspace);
  }

  return () => {
    isCancelled = true;
    clearInterval(pollInterval);
    if (typeof window !== "undefined") {
      window.removeEventListener("focus", safeFetchWorkspace);
      window.removeEventListener("online", safeFetchWorkspace);
    }
  };
}

export async function fetchLatestUserDataFromFirestore(userId: string): Promise<GoStarsBackupData | null> {
  return fetchFullUserWorkspaceFromFirestore(userId);
}

/**
 * Data Integrity Checker: Compares local records vs cloud subcollection records
 */
export async function checkDataIntegrity(
  userId: string,
  localData: GoStarsBackupData
): Promise<{
  studentsDiff: number;
  reportsDiff: number;
  attendanceDiff: number;
  paymentsDiff: number;
  isConsistent: boolean;
}> {
  if (!userId) {
    return { studentsDiff: 0, reportsDiff: 0, attendanceDiff: 0, paymentsDiff: 0, isConsistent: true };
  }

  try {
    const cloudWorkspace = await fetchFullUserWorkspaceFromFirestore(userId);
    if (!cloudWorkspace) {
      return { studentsDiff: 0, reportsDiff: 0, attendanceDiff: 0, paymentsDiff: 0, isConsistent: true };
    }

    const studentsDiff = (localData.students?.length || 0) - (cloudWorkspace.students?.length || 0);
    const reportsDiff = (localData.reports?.length || 0) - (cloudWorkspace.reports?.length || 0);
    const attendanceDiff = (localData.attendanceRecords?.length || 0) - (cloudWorkspace.attendanceRecords?.length || 0);
    const paymentsDiff = (localData.paymentTransactions?.length || 0) - (cloudWorkspace.paymentTransactions?.length || 0);

    const isConsistent = studentsDiff === 0 && reportsDiff === 0 && attendanceDiff === 0 && paymentsDiff === 0;

    return {
      studentsDiff,
      reportsDiff,
      attendanceDiff,
      paymentsDiff,
      isConsistent
    };
  } catch {
    return { studentsDiff: 0, reportsDiff: 0, attendanceDiff: 0, paymentsDiff: 0, isConsistent: true };
  }
}

export { onAuthStateChanged };
export type { User };
