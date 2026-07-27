import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Test connection on boot as specified in Firebase guidelines
export async function testFirebaseConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase connection initialized successfully');
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error('Please check your Firebase configuration.');
    } else {
      console.log('Firebase Firestore connected.');
    }
  }
}
