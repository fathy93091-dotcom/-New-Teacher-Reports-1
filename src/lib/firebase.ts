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
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  disableNetwork
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { GoStarsBackupData } from "../types";

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Custom database ID from firebase-applet-config.json if specified
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");

// Google Sign-In Only
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

// Firestore User Data Sync
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let lastSavedHash: string = "";
let isQuotaExhausted = typeof window !== "undefined" && (
  sessionStorage.getItem("firestore_quota_exhausted") === "true" ||
  localStorage.getItem("firestore_quota_exhausted") === "true"
);

if (isQuotaExhausted) {
  disableNetwork(db).catch(() => {});
}

function markQuotaExhausted() {
  if (!isQuotaExhausted) {
    isQuotaExhausted = true;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("firestore_quota_exhausted", "true");
        localStorage.setItem("firestore_quota_exhausted", "true");
      } catch (_) {}
    }
    disableNetwork(db).catch(() => {});
  }
}

export function subscribeToUserData(
  userId: string,
  onData: (data: GoStarsBackupData | null) => void
) {
  if (isQuotaExhausted || !userId) return () => {};

  try {
    const userDocRef = doc(db, "users", userId);
    return onSnapshot(
      userDocRef,
      snapshot => {
        if (snapshot.exists()) {
          onData(snapshot.data() as GoStarsBackupData);
        } else {
          onData(null);
        }
      },
      error => {
        if (error?.code === "resource-exhausted" || error?.message?.includes("Quota")) {
          markQuotaExhausted();
          console.warn("Firestore subscription quota limit reached. LocalStorage remains active.");
        } else {
          console.error("Error subscribing to user data from Firestore:", error);
        }
      }
    );
  } catch (err: any) {
    if (err?.code === "resource-exhausted" || err?.message?.includes("Quota")) {
      markQuotaExhausted();
    }
    return () => {};
  }
}

export async function saveUserDataToFirestore(
  userId: string,
  data: GoStarsBackupData
): Promise<void> {
  if (!userId || isQuotaExhausted) return;

  const currentHash = JSON.stringify(data);
  if (currentHash === lastSavedHash) {
    return; // No change in data
  }

  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    if (isQuotaExhausted) return;
    try {
      lastSavedHash = currentHash;
      const userDocRef = doc(db, "users", userId);
      await setDoc(userDocRef, {
        ...data,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error: any) {
      if (error?.code === "resource-exhausted" || error?.message?.includes("Quota")) {
        markQuotaExhausted();
        if (saveTimeout) clearTimeout(saveTimeout);
        console.warn("Firestore daily write quota reached. LocalStorage persistence remains active.");
      } else {
        console.error("Error saving data to Firestore:", error);
      }
    }
  }, 2000);
}

export { onAuthStateChanged };
export type { User };
