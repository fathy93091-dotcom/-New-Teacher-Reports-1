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
  onSnapshot
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { GoStarsBackupData } from "../types";

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Custom database ID from firebase-applet-config.json if specified
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");

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

// Sanitize object for Firestore (recursively strip undefined and non-serializable fields)
function cleanPayloadForFirestore<T>(data: T): any {
  if (data === null || data === undefined) return null;
  return JSON.parse(
    JSON.stringify(data, (_, value) => (value === undefined ? null : value))
  );
}

// Firestore User Data Sync Engine
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let lastSavedHash: string = "";

export function subscribeToUserData(
  userId: string,
  onData: (data: GoStarsBackupData | null) => void
) {
  if (!userId) return () => {};

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
        // Silently handle transient connection/permission errors while user authenticates
        console.warn("Firestore subscription note:", error?.message || error);
      }
    );
  } catch (err: any) {
    console.warn("Firestore listener initialization note:", err?.message || err);
    return () => {};
  }
}

export async function saveUserDataToFirestore(
  userId: string,
  data: GoStarsBackupData
): Promise<void> {
  if (!userId) return;

  const currentHash = JSON.stringify(data);
  if (currentHash === lastSavedHash) {
    return; // No change in data
  }

  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    try {
      lastSavedHash = currentHash;
      const userDocRef = doc(db, "users", userId);
      const cleanData = cleanPayloadForFirestore(data);
      
      await setDoc(
        userDocRef,
        {
          ...cleanData,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (error: any) {
      console.warn("Firestore sync note:", error?.message || error);
    }
  }, 1500);
}

export { onAuthStateChanged };
export type { User };

