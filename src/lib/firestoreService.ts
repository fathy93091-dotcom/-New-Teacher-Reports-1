import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where
} from "firebase/firestore";
import { db } from "./firebase";
import { handleFirestoreError, OperationType } from "./firestoreErrors";
import {
  Student,
  Session,
  DailyReport,
  MonthlyReport,
  StudentMemory,
  AppSettings
} from "../types";

export async function saveStudentToFirestore(student: Student): Promise<void> {
  const path = `students/${student.id}`;
  try {
    await setDoc(doc(db, "students", student.id), student, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveSessionToFirestore(session: Session): Promise<void> {
  const path = `sessions/${session.id}`;
  try {
    await setDoc(doc(db, "sessions", session.id), session, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveDailyReportToFirestore(report: DailyReport): Promise<void> {
  const path = `dailyReports/${report.id}`;
  try {
    await setDoc(doc(db, "dailyReports", report.id), report, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveMonthlyReportToFirestore(report: MonthlyReport): Promise<void> {
  const path = `monthlyReports/${report.id}`;
  try {
    await setDoc(doc(db, "monthlyReports", report.id), report, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveStudentMemoryToFirestore(memory: StudentMemory): Promise<void> {
  const path = `studentMemories/${memory.id}`;
  try {
    await setDoc(doc(db, "studentMemories", memory.id), memory, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveSettingsToFirestore(settings: AppSettings): Promise<void> {
  const path = `settings/default_teacher_settings`;
  try {
    await setDoc(doc(db, "settings", "default_teacher_settings"), settings, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function loadInitialFirestoreData(): Promise<{
  students: Student[];
  sessions: Session[];
  dailyReports: DailyReport[];
  monthlyReports: MonthlyReport[];
  memories: Record<string, StudentMemory>;
  settings?: AppSettings;
}> {
  const result = {
    students: [] as Student[],
    sessions: [] as Session[],
    dailyReports: [] as DailyReport[],
    monthlyReports: [] as MonthlyReport[],
    memories: {} as Record<string, StudentMemory>,
    settings: undefined as AppSettings | undefined
  };

  try {
    const stSnap = await getDocs(collection(db, "students"));
    stSnap.forEach(d => result.students.push(d.data() as Student));
  } catch (e) {
    console.warn("Firestore students fetch skipped or empty:", e);
  }

  try {
    const seSnap = await getDocs(collection(db, "sessions"));
    seSnap.forEach(d => result.sessions.push(d.data() as Session));
  } catch (e) {
    console.warn("Firestore sessions fetch skipped or empty:", e);
  }

  try {
    const drSnap = await getDocs(collection(db, "dailyReports"));
    drSnap.forEach(d => result.dailyReports.push(d.data() as DailyReport));
  } catch (e) {
    console.warn("Firestore dailyReports fetch skipped or empty:", e);
  }

  try {
    const mrSnap = await getDocs(collection(db, "monthlyReports"));
    mrSnap.forEach(d => result.monthlyReports.push(d.data() as MonthlyReport));
  } catch (e) {
    console.warn("Firestore monthlyReports fetch skipped or empty:", e);
  }

  try {
    const memSnap = await getDocs(collection(db, "studentMemories"));
    memSnap.forEach(d => {
      const mem = d.data() as StudentMemory;
      if (mem.studentId) {
        result.memories[mem.studentId] = mem;
      }
    });
  } catch (e) {
    console.warn("Firestore memories fetch skipped or empty:", e);
  }

  try {
    const setSnap = await getDoc(doc(db, "settings", "default_teacher_settings"));
    if (setSnap.exists()) {
      result.settings = setSnap.data() as AppSettings;
    }
  } catch (e) {
    console.warn("Firestore settings fetch skipped or empty:", e);
  }

  return result;
}
