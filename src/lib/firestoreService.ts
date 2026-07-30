import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  writeBatch
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

export function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanFirestoreData(item)) as unknown as T;
  }
  if (typeof obj === "object" && obj.constructor === Object) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

export async function saveStudentToFirestore(student: Student): Promise<void> {
  const path = `students/${student.id}`;
  try {
    await setDoc(doc(db, "students", student.id), cleanFirestoreData(student), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteStudentFromFirestore(studentId: string): Promise<void> {
  const path = `students/${studentId}`;
  try {
    await deleteDoc(doc(db, "students", studentId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveSessionToFirestore(session: Session): Promise<void> {
  const path = `sessions/${session.id}`;
  try {
    await setDoc(doc(db, "sessions", session.id), cleanFirestoreData(session), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteSessionFromFirestore(sessionId: string): Promise<void> {
  const path = `sessions/${sessionId}`;
  try {
    await deleteDoc(doc(db, "sessions", sessionId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveDailyReportToFirestore(report: DailyReport): Promise<void> {
  const path = `dailyReports/${report.id}`;
  try {
    await setDoc(doc(db, "dailyReports", report.id), cleanFirestoreData(report), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteDailyReportFromFirestore(reportId: string): Promise<void> {
  const path = `dailyReports/${reportId}`;
  try {
    await deleteDoc(doc(db, "dailyReports", reportId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveMonthlyReportToFirestore(report: MonthlyReport): Promise<void> {
  const path = `monthlyReports/${report.id}`;
  try {
    await setDoc(doc(db, "monthlyReports", report.id), cleanFirestoreData(report), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteMonthlyReportFromFirestore(reportId: string): Promise<void> {
  const path = `monthlyReports/${reportId}`;
  try {
    await deleteDoc(doc(db, "monthlyReports", reportId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveStudentMemoryToFirestore(memory: StudentMemory): Promise<void> {
  const path = `studentMemories/${memory.id}`;
  try {
    await setDoc(doc(db, "studentMemories", memory.id), cleanFirestoreData(memory), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveSettingsToFirestore(settings: AppSettings): Promise<void> {
  const path = `settings/default_teacher_settings`;
  try {
    await setDoc(doc(db, "settings", "default_teacher_settings"), cleanFirestoreData(settings), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function syncAllDataToFirestore(data: {
  students: Student[];
  sessions: Session[];
  dailyReports: DailyReport[];
  monthlyReports: MonthlyReport[];
  memories: Record<string, StudentMemory>;
  settings: AppSettings;
}): Promise<void> {
  try {
    const batch = writeBatch(db);

    data.students.forEach(s => {
      batch.set(doc(db, "students", s.id), cleanFirestoreData(s), { merge: true });
    });

    data.sessions.forEach(s => {
      batch.set(doc(db, "sessions", s.id), cleanFirestoreData(s), { merge: true });
    });

    data.dailyReports.forEach(r => {
      batch.set(doc(db, "dailyReports", r.id), cleanFirestoreData(r), { merge: true });
    });

    data.monthlyReports.forEach(r => {
      batch.set(doc(db, "monthlyReports", r.id), cleanFirestoreData(r), { merge: true });
    });

    Object.values(data.memories).forEach(m => {
      batch.set(doc(db, "studentMemories", m.id), cleanFirestoreData(m), { merge: true });
    });

    batch.set(doc(db, "settings", "default_teacher_settings"), cleanFirestoreData(data.settings), { merge: true });

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "batch_sync");
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

