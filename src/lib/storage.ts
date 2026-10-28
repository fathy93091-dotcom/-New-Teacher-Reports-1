import {
  Student,
  StudentReportPreferences,
  CombinedStudentGroup,
  Group,
  PrivateLesson,
  Lesson,
  AttendanceRecord,
  ExamRecord,
  PaymentTransaction,
  GeneratedReport,
  AppSettings,
  GoStarsBackupData,
  deduplicateReportsList,
  areReportsDuplicate
} from "../types";
import {
  initialSettings,
  initialStudents,
  initialGroups,
  initialPrivateLessons,
  initialLessons,
  initialAttendanceRecords,
  initialExams,
  initialPaymentTransactions,
  initialReports
} from "../data/seedData";
import { idbGet, idbSet, idbDelete } from "./idbStorage";
import { enqueueCloudSync } from "./syncQueue";
import { sanitizeStudent } from "./financeEngine";

function getScopedKey(baseKey: string, userId?: string): string {
  if (!userId) return `gostars_guest_${baseKey}`;
  return `gostars_${userId}_${baseKey}`;
}

function getScopedVaultKey(baseKey: string, userId?: string): string {
  if (!userId) return `gostars_vault_guest_${baseKey}`;
  return `gostars_vault_${userId}_${baseKey}`;
}

// In-memory cache for instantaneous synchronous UI access backed by IndexedDB
const memoryStore = new Map<string, any>();

function getItem<T>(key: string, fallback: T): T {
  // 1. Primary: Memory cache (fastest & handles unlimited records)
  if (memoryStore.has(key)) {
    return memoryStore.get(key) as T;
  }

  // 2. Secondary: Fallback to localStorage for small UI items
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null && raw !== undefined) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(fallback)) {
        const arr = Array.isArray(parsed) ? parsed : fallback;
        memoryStore.set(key, arr);
        return arr as unknown as T;
      }
      if (parsed !== null && parsed !== undefined) {
        memoryStore.set(key, parsed);
        return parsed;
      }
    }
  } catch (e) {
    console.debug(`[GoStars Storage] localStorage read note for ${key}:`, e);
  }

  return fallback;
}

function setItem<T>(key: string, value: T): void {
  // Update in-memory cache immediately
  memoryStore.set(key, value);

  // Persist to IndexedDB asynchronously as primary reliable local database
  idbSet(key, value).catch(err => {
    console.warn(`[GoStars Storage] IndexedDB persist note for ${key}:`, err);
  });

  // Persist to localStorage for synchronous instant boot recovery across page reloads
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // If quota exceeded, IndexedDB is already storing it safely
    console.debug(`[GoStars Storage] localStorage quota note for ${key}:`, err);
  }
}

function removeItem(key: string): void {
  memoryStore.delete(key);
  idbDelete(key).catch(() => {});
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.debug(`[GoStars Storage] Remove item note for ${key}:`, e);
  }
}

export function isDemoTeacherName(_rawName?: string): boolean {
  return false;
}

export function sanitizeTeacherName(rawName?: string): string {
  if (!rawName) return "";
  return rawName.trim();
}

/**
 * Deep entity reconciliation for resilient real-time syncing without destructive overwrites
 */
export function mergeEntityLists<T extends { id?: string | number; createdAt?: string; date?: string; updatedAt?: string; deletedAt?: string | null }>(
  localList: T[],
  remoteList: T[],
  sanitizeFn?: (item: T) => T,
  tombstones?: Set<string> | string[]
): T[] {
  const localSafe = Array.isArray(localList) ? localList : [];
  const remoteSafe = Array.isArray(remoteList) ? remoteList : [];

  const map = new Map<string, T>();
  const deletedIds = new Set<string>();

  // Collect external tombstones if passed
  if (tombstones) {
    tombstones.forEach(id => {
      if (id !== undefined && id !== null && String(id).trim() !== "") {
        deletedIds.add(String(id).trim());
      }
    });
  }

  const getKey = (item: T) => {
    if (item && item.id !== undefined && item.id !== null && String(item.id).trim() !== "") {
      return String(item.id).trim();
    }
    return null;
  };

  // Collect all soft-deleted / tombstoned IDs across remote & local
  remoteSafe.forEach(item => {
    const k = getKey(item);
    if (k && item.deletedAt) {
      deletedIds.add(k);
    }
  });
  localSafe.forEach(item => {
    const k = getKey(item);
    if (k && item.deletedAt) {
      deletedIds.add(k);
    }
  });

  // 1. First add remote items (strictly excluding deleted/tombstoned)
  remoteSafe.forEach(item => {
    const k = getKey(item);
    if (k && !deletedIds.has(k)) {
      const sanitized = sanitizeFn ? sanitizeFn(item) : item;
      map.set(k, sanitized);
    }
  });

  // 2. Union merge with local items (strictly excluding deleted/tombstoned)
  localSafe.forEach(localItem => {
    const k = getKey(localItem);
    if (k && !deletedIds.has(k)) {
      const sanitized = sanitizeFn ? sanitizeFn(localItem) : localItem;
      const existingRemote = map.get(k);
      if (!existingRemote) {
        // Exists locally but not remotely yet -> PRESERVE IT!
        map.set(k, sanitized);
      } else {
        // Exists in both: merge fields, preferring newer or equal updatedAt if present
        const localUpdated = new Date(sanitized.updatedAt || sanitized.createdAt || 0).getTime();
        const remoteUpdated = new Date(existingRemote.updatedAt || existingRemote.createdAt || 0).getTime();

        if (localUpdated >= remoteUpdated) {
          map.set(k, { ...existingRemote, ...sanitized });
        } else {
          map.set(k, { ...sanitized, ...existingRemote });
        }
      }
    }
  });

  return Array.from(map.values());
}

export function cleanSettings(s: AppSettings, defaultFallbackName?: string): AppSettings {
  if (!s || typeof s !== "object") {
    return {
      ...initialSettings,
      teacherName: defaultFallbackName || ""
    };
  }
  const copy: AppSettings = { ...s };

  if (copy.teacherName === undefined && defaultFallbackName) {
    copy.teacherName = defaultFallbackName;
  }

  if (!copy.subjectDefaults) {
    copy.subjectDefaults = [];
  }

  if (copy.generalAiInstructions === undefined || copy.generalAiInstructions === null) {
    copy.generalAiInstructions = "";
  }

  return copy;
}

export function mergeSettings(
  local: AppSettings,
  remote?: AppSettings,
  fallbackTeacherName?: string
): AppSettings {
  if (!remote) return cleanSettings(local, fallbackTeacherName);

  const localTime = local?.updatedAt ? new Date(local.updatedAt).getTime() : 0;
  const remoteTime = remote?.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
  const isLocalNewer = localTime > 0 && localTime > remoteTime;

  const primary = isLocalNewer ? local : remote;
  const secondary = isLocalNewer ? remote : local;

  const primaryInst = (primary?.generalAiInstructions || "").trim();
  const secondaryInst = (secondary?.generalAiInstructions || "").trim();
  const effectiveGeneralAiInstructions = primaryInst || secondaryInst || "";

  const subjectMap = new Map<string, { subject: string; instruction: string }>();

  (secondary?.subjectDefaults || []).forEach(item => {
    if (item && item.subject) {
      subjectMap.set(item.subject.trim().toLowerCase(), {
        subject: item.subject.trim(),
        instruction: item.instruction || ""
      });
    }
  });

  (primary?.subjectDefaults || []).forEach(item => {
    if (item && item.subject) {
      const key = item.subject.trim().toLowerCase();
      const existing = subjectMap.get(key);
      if (!existing) {
        subjectMap.set(key, {
          subject: item.subject.trim(),
          instruction: item.instruction || ""
        });
      } else if (item.instruction && item.instruction.trim().length > 0) {
        existing.instruction = item.instruction.trim();
      }
    }
  });

  // Safely merge monthlyReportSettings and its templates library by ID without losing any custom template
  let mergedMonthlyReportSettings = primary.monthlyReportSettings || secondary.monthlyReportSettings;
  if (local?.monthlyReportSettings || remote?.monthlyReportSettings) {
    const localMR = local?.monthlyReportSettings;
    const remoteMR = remote?.monthlyReportSettings;
    const localMRTime = localMR?.updatedAt ? new Date(localMR.updatedAt).getTime() : localTime;
    const remoteMRTime = remoteMR?.updatedAt ? new Date(remoteMR.updatedAt).getTime() : remoteTime;
    const isLocalMRNewer = localMRTime > 0 && localMRTime >= remoteMRTime;

    const priMR = isLocalMRNewer ? (localMR || remoteMR) : (remoteMR || localMR);
    const secMR = isLocalMRNewer ? remoteMR : localMR;

    const templateMap = new Map<string, any>();
    (secMR?.templates || []).forEach(tpl => {
      if (tpl && tpl.id) templateMap.set(tpl.id, { ...tpl });
    });
    (priMR?.templates || []).forEach(tpl => {
      if (tpl && tpl.id) {
        const existing = templateMap.get(tpl.id);
        if (!existing) {
          templateMap.set(tpl.id, { ...tpl });
        } else {
          const exTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
          const tplTime = tpl.updatedAt ? new Date(tpl.updatedAt).getTime() : 0;
          if (tplTime >= exTime) {
            templateMap.set(tpl.id, { ...existing, ...tpl });
          }
        }
      }
    });

    const mergedTemplates = Array.from(templateMap.values());
    mergedMonthlyReportSettings = {
      dailyAnalysisInstructions:
        priMR?.dailyAnalysisInstructions || secMR?.dailyAnalysisInstructions || "",
      monthlyTemplateInstructions:
        priMR?.monthlyTemplateInstructions || secMR?.monthlyTemplateInstructions || "",
      templates: mergedTemplates.length > 0 ? mergedTemplates : undefined,
      activeTemplateId: priMR?.activeTemplateId || secMR?.activeTemplateId,
      updatedAt: priMR?.updatedAt || secMR?.updatedAt || new Date().toISOString()
    };
  }

  return {
    teacherName: primary.teacherName || secondary.teacherName || fallbackTeacherName || "",
    preferredLanguage: primary.preferredLanguage || secondary.preferredLanguage || "ar",
    defaultSubject: primary.defaultSubject || secondary.defaultSubject || "",
    generalAiInstructions: effectiveGeneralAiInstructions,
    subjectDefaults: Array.from(subjectMap.values()),
    notificationMinutesBefore: primary.notificationMinutesBefore ?? secondary.notificationMinutesBefore ?? 15,
    notificationsEnabled: primary.notificationsEnabled ?? secondary.notificationsEnabled ?? true,
    monthlyReportSettings: mergedMonthlyReportSettings,
    updatedAt: primary.updatedAt || secondary.updatedAt || new Date().toISOString()
  };
}

export const StorageEngine = {
  cleanSettings,
  mergeSettings,

  /**
   * Warm up memory store directly from IndexedDB on application boot
   */
  async hydrateFromIndexedDB(userId?: string): Promise<void> {
    const keys = [
      "settings",
      "students",
      "combinedStudentGroups",
      "groups",
      "privateLessons",
      "lessons",
      "attendanceRecords",
      "examRecords",
      "paymentTransactions",
      "reports"
    ];

    try {
      await Promise.all(
        keys.map(async baseKey => {
          const scopedKey = getScopedKey(baseKey, userId);
          const val = await idbGet<any>(scopedKey);
          if (val !== null && val !== undefined) {
            memoryStore.set(scopedKey, val);
          }
        })
      );
    } catch (err) {
      console.debug("[GoStars Storage] Hydration note:", err);
    }
  },

  // 1. Settings
  getSettings(userId?: string): AppSettings {
    const key = getScopedKey("settings", userId);
    const raw = getItem<AppSettings>(key, initialSettings);
    return cleanSettings(raw);
  },

  saveSettings(settings: AppSettings, userId?: string): void {
    const key = getScopedKey("settings", userId);
    const cleaned = cleanSettings({
      ...settings,
      updatedAt: settings.updatedAt || new Date().toISOString()
    });
    setItem(key, cleaned);

    if (userId) {
      enqueueCloudSync({
        userId,
        entityType: "settings",
        entityId: "appSettings",
        operation: "update",
        payload: cleaned
      }).catch(() => {});
    }
  },

  // Tombstones / Deleted Students Registry (Unified across all legacy & scoped keys)
  getTombstones(userId?: string): Set<string> {
    const key = getScopedKey("deleted_student_ids", userId);
    const raw = getItem<string[]>(key, []);
    const result = new Set<string>(
      Array.isArray(raw) ? raw.map(id => String(id).trim()).filter(Boolean) : []
    );

    try {
      const extraKeys = [
        userId ? `gostars_tombstones_${userId}` : null,
        "gostars_tombstones",
        getScopedKey("deleted_student_ids")
      ].filter(Boolean) as string[];

      for (const k of extraKeys) {
        const str = localStorage.getItem(k);
        if (str) {
          const parsed = JSON.parse(str);
          if (Array.isArray(parsed)) {
            parsed.forEach(id => {
              if (id && String(id).trim()) {
                result.add(String(id).trim());
              }
            });
          }
        }
      }
    } catch {}

    return result;
  },

  addTombstone(id: string, userId?: string): void {
    if (!id || !String(id).trim()) return;
    const cleanId = String(id).trim();
    const key = getScopedKey("deleted_student_ids", userId);
    const current = this.getTombstones(userId);
    current.add(cleanId);
    const arr = Array.from(current);
    setItem(key, arr);
    idbSet(key, arr).catch(() => {});
    try {
      if (userId) {
        localStorage.setItem(`gostars_tombstones_${userId}`, JSON.stringify(arr));
      }
      localStorage.setItem("gostars_tombstones", JSON.stringify(arr));
    } catch {}
  },

  removeTombstone(id: string, userId?: string): void {
    if (!id) return;
    const cleanId = String(id).trim();
    const key = getScopedKey("deleted_student_ids", userId);
    const current = this.getTombstones(userId);
    if (current.has(cleanId)) {
      current.delete(cleanId);
      const arr = Array.from(current);
      setItem(key, arr);
      idbSet(key, arr).catch(() => {});
      try {
        if (userId) {
          localStorage.setItem(`gostars_tombstones_${userId}`, JSON.stringify(arr));
        }
        localStorage.setItem("gostars_tombstones", JSON.stringify(arr));
      } catch {}
    }
  },

  isTombstoned(id: string, userId?: string): boolean {
    if (!id) return false;
    return this.getTombstones(userId).has(String(id).trim());
  },

  // 2. Students
  getStudents(userId?: string): Student[] {
    const key = getScopedKey("students", userId);
    const tombstones = this.getTombstones(userId);
    const raw = getItem<Student[]>(key, initialStudents);
    const cleanList = Array.isArray(raw)
      ? raw.filter(s => s && s.id && !tombstones.has(String(s.id).trim()))
      : [];
    return cleanList.map(sanitizeStudent);
  },

  saveStudents(students: Student[], userId?: string): void {
    const key = getScopedKey("students", userId);
    const tombstones = this.getTombstones(userId);
    const sanitized = (students || [])
      .filter(s => s && s.id && !tombstones.has(String(s.id).trim()))
      .map(s => sanitizeStudent({
        ...s,
        updatedAt: s.updatedAt || new Date().toISOString()
      }));
    setItem(key, sanitized);
  },

  saveStudent(student: Student, userId?: string): void {
    if (!student || !student.id) return;
    const cleanId = String(student.id).trim();
    this.removeTombstone(cleanId, userId);

    const current = this.getStudents(userId);
    const sanitized = sanitizeStudent({
      ...student,
      id: cleanId,
      updatedAt: student.updatedAt || new Date().toISOString()
    });
    const idx = current.findIndex(s => String(s.id).trim() === cleanId);
    let updatedList: Student[];

    if (idx >= 0) {
      updatedList = [...current];
      updatedList[idx] = sanitized;
    } else {
      updatedList = [sanitized, ...current.filter(s => String(s.id).trim() !== cleanId)];
    }

    this.saveStudents(updatedList, userId);

    if (userId) {
      enqueueCloudSync({
        userId,
        entityType: "student",
        entityId: cleanId,
        operation: idx >= 0 ? "update" : "create",
        payload: sanitized
      }).catch(() => {});
    }
  },

  deleteStudent(studentId: string, userId?: string): void {
    if (!studentId) return;
    const cleanId = String(studentId).trim();
    this.addTombstone(cleanId, userId);

    const current = this.getStudents(userId);
    const updated = current.filter(s => String(s.id).trim() !== cleanId);
    this.saveStudents(updated, userId);

    // Also remove preferences
    try {
      localStorage.removeItem(`gostars_student_prefs_${cleanId}`);
    } catch {}

    // Purge pending create/update sync queue items for this student in IndexedDB
    import("./idbStorage").then(idb => {
      idb.getIDB().then(db => {
        try {
          const tx = db.transaction("sync_queue", "readwrite");
          const store = tx.objectStore("sync_queue");
          const req = store.getAll();
          req.onsuccess = () => {
            const all = req.result || [];
            all.forEach((item: any) => {
              if (item.entityType === "student" && String(item.entityId).trim() === cleanId) {
                store.delete(item.id);
              }
            });
          };
        } catch {}
      }).catch(() => {});
    }).catch(() => {});

    if (userId) {
      enqueueCloudSync({
        userId,
        entityType: "student",
        entityId: cleanId,
        operation: "delete"
      }).catch(() => {});

      import("./firebase").then(fb => {
        if (fb && fb.deleteStudentPermanentlyFromFirestore) {
          fb.deleteStudentPermanentlyFromFirestore(userId, cleanId).catch(() => {});
        }
      }).catch(() => {});
    }
  },

  // 3. Reports
  getReports(userId?: string): GeneratedReport[] {
    const key = getScopedKey("reports", userId);
    const raw = getItem<GeneratedReport[]>(key, initialReports);
    return deduplicateReportsList(raw);
  },

  saveReports(reports: GeneratedReport[], userId?: string): void {
    const key = getScopedKey("reports", userId);
    const clean = deduplicateReportsList(reports || []);
    setItem(key, clean);
  },

  saveReport(report: GeneratedReport, userId?: string): void {
    const current = this.getReports(userId);
    const idx = current.findIndex(r => areReportsDuplicate(r, report));
    let updatedList: GeneratedReport[];

    if (idx >= 0) {
      updatedList = [...current];
      updatedList[idx] = { ...current[idx], ...report };
    } else {
      updatedList = [report, ...current.filter(r => !areReportsDuplicate(r, report))];
    }

    const cleanList = deduplicateReportsList(updatedList);
    this.saveReports(cleanList, userId);

    if (userId) {
      enqueueCloudSync({
        userId,
        entityType: "report",
        entityId: report.id,
        operation: idx >= 0 ? "update" : "create",
        payload: report
      }).catch(() => {});
    }
  },

  deleteReport(reportId: string, userId?: string): void {
    const current = this.getReports(userId);
    const updated = current.filter(r => r.id !== reportId);
    this.saveReports(updated, userId);

    if (userId) {
      enqueueCloudSync({
        userId,
        entityType: "report",
        entityId: reportId,
        operation: "delete"
      }).catch(() => {});
    }
  },

  recoverAllReports(userId?: string): GeneratedReport[] {
    const collected: GeneratedReport[] = [];

    // 1. Current scoped reports
    collected.push(...this.getReports(userId));
    // 2. Guest reports
    collected.push(...this.getReports(undefined));

    // 3. Check memory store
    memoryStore.forEach((val, key) => {
      if (key && (key.includes("reports") || key.includes("attendance")) && Array.isArray(val)) {
        for (const item of val) {
          if (item && (item.id || item.reportText || item.generatedText || item.teacherNotes)) {
            if (item.generatedText || item.reportText || item.teacherNotes || item.attendance) {
              collected.push(item as GeneratedReport);
            }
          }
        }
      }
    });

    // 4. Scan all localStorage keys for any reports
    if (typeof localStorage !== "undefined") {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.includes("reports") || k.includes("attendance") || k.includes("gostars"))) {
            const rawVal = localStorage.getItem(k);
            if (rawVal) {
              try {
                const parsed = JSON.parse(rawVal);
                if (Array.isArray(parsed)) {
                  for (const item of parsed) {
                    if (item && (item.id || item.reportText || item.generatedText || item.teacherNotes)) {
                      if (item.generatedText || item.reportText || item.teacherNotes || item.attendance) {
                        collected.push(item as GeneratedReport);
                      }
                    }
                  }
                }
              } catch {}
            }
          }
        }
      } catch {}
    }

    // 5. Also scan attendance records for embedded reports
    const attendance = this.getAttendanceRecords(userId);
    if (Array.isArray(attendance)) {
      for (const ar of attendance) {
        if (ar && (ar.generatedReportText || ar.teacherNotes)) {
          collected.push({
            id: ar.id ? `att_rep_${ar.id}` : `att_rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            studentId: ar.studentId,
            studentName: ar.studentName || "",
            subject: ar.subject || "",
            lessonNumber: ar.lessonNumber,
            attendance: ar.attendance,
            deductCost: ar.deducted,
            date: ar.date,
            teacherNotes: ar.teacherNotes || "",
            aiInstructions: ar.aiInstructions || "",
            reportText: ar.generatedReportText || ar.teacherNotes || "",
            generatedText: ar.generatedReportText || ar.teacherNotes || "",
            archived: (ar as any).archived === true,
            archivedAt: (ar as any).archivedAt,
            archiveGroup: (ar as any).archiveGroup,
            manuallyUnarchived: (ar as any).manuallyUnarchived === true,
            createdAt: ar.date
          });
        }
      }
    }

    const clean = deduplicateReportsList(collected);
    if (clean.length > 0) {
      this.saveReports(clean, userId);
    }
    return clean;
  },

  // 4. Attendance
  getAttendanceRecords(userId?: string): AttendanceRecord[] {
    const key = getScopedKey("attendanceRecords", userId);
    return getItem<AttendanceRecord[]>(key, initialAttendanceRecords);
  },

  saveAttendanceRecords(attendance: AttendanceRecord[], userId?: string): void {
    const key = getScopedKey("attendanceRecords", userId);
    setItem(key, attendance || []);
  },

  saveAttendanceRecord(record: AttendanceRecord, userId?: string): void {
    const current = this.getAttendanceRecords(userId);
    const idx = current.findIndex(a => a.id === record.id);
    let updatedList: AttendanceRecord[];

    if (idx >= 0) {
      updatedList = [...current];
      updatedList[idx] = record;
    } else {
      updatedList = [record, ...current];
    }

    this.saveAttendanceRecords(updatedList, userId);

    if (userId) {
      enqueueCloudSync({
        userId,
        entityType: "attendance",
        entityId: record.id,
        operation: idx >= 0 ? "update" : "create",
        payload: record
      }).catch(() => {});
    }
  },

  deleteAttendanceRecord(recordId: string, userId?: string): void {
    const current = this.getAttendanceRecords(userId);
    const updated = current.filter(a => a.id !== recordId);
    this.saveAttendanceRecords(updated, userId);

    if (userId) {
      enqueueCloudSync({
        userId,
        entityType: "attendance",
        entityId: recordId,
        operation: "delete"
      }).catch(() => {});
    }
  },

  // 5. Payments
  getPayments(userId?: string): PaymentTransaction[] {
    const key = getScopedKey("paymentTransactions", userId);
    return getItem<PaymentTransaction[]>(key, initialPaymentTransactions);
  },

  savePayments(payments: PaymentTransaction[], userId?: string): void {
    const key = getScopedKey("paymentTransactions", userId);
    setItem(key, payments || []);
  },

  savePayment(payment: PaymentTransaction, userId?: string): void {
    const current = this.getPayments(userId);
    const idx = current.findIndex(p => p.id === payment.id);
    let updatedList: PaymentTransaction[];

    if (idx >= 0) {
      updatedList = [...current];
      updatedList[idx] = payment;
    } else {
      updatedList = [payment, ...current];
    }

    this.savePayments(updatedList, userId);

    if (userId) {
      enqueueCloudSync({
        userId,
        entityType: "payment",
        entityId: payment.id,
        operation: idx >= 0 ? "update" : "create",
        payload: payment
      }).catch(() => {});
    }
  },

  deletePayment(paymentId: string, userId?: string): void {
    const current = this.getPayments(userId);
    const updated = current.filter(p => p.id !== paymentId);
    this.savePayments(updated, userId);

    if (userId) {
      enqueueCloudSync({
        userId,
        entityType: "payment",
        entityId: paymentId,
        operation: "delete"
      }).catch(() => {});
    }
  },

  // 6. Groups & Lessons
  getGroups(userId?: string): Group[] {
    const key = getScopedKey("groups", userId);
    return getItem<Group[]>(key, initialGroups);
  },

  saveGroups(groups: Group[], userId?: string): void {
    const key = getScopedKey("groups", userId);
    setItem(key, groups || []);
  },

  deleteGroup(groupId: string, userId?: string): void {
    const current = this.getGroups(userId);
    const updated = current.filter(g => g.id !== groupId);
    this.saveGroups(updated, userId);

    if (userId) {
      enqueueCloudSync({
        userId,
        entityType: "group",
        entityId: groupId,
        operation: "delete"
      }).catch(() => {});
    }
  },

  getPrivateLessons(userId?: string): PrivateLesson[] {
    const key = getScopedKey("privateLessons", userId);
    return getItem<PrivateLesson[]>(key, initialPrivateLessons);
  },

  savePrivateLessons(privateLessons: PrivateLesson[], userId?: string): void {
    const key = getScopedKey("privateLessons", userId);
    setItem(key, privateLessons || []);
  },

  deletePrivateLesson(lessonId: string, userId?: string): void {
    const current = this.getPrivateLessons(userId);
    const updated = current.filter(p => p.id !== lessonId);
    this.savePrivateLessons(updated, userId);

    if (userId) {
      enqueueCloudSync({
        userId,
        entityType: "privateLesson",
        entityId: lessonId,
        operation: "delete"
      }).catch(() => {});
    }
  },

  getCombinedStudentGroups(userId?: string): CombinedStudentGroup[] {
    const key = getScopedKey("combinedStudentGroups", userId);
    return getItem<CombinedStudentGroup[]>(key, []);
  },

  saveCombinedStudentGroups(groups: CombinedStudentGroup[], userId?: string): void {
    const key = getScopedKey("combinedStudentGroups", userId);
    setItem(key, groups || []);
  },

  deleteCombinedStudentGroup(groupId: string, userId?: string): void {
    const current = this.getCombinedStudentGroups(userId);
    const updated = current.filter(cg => cg.id !== groupId);
    this.saveCombinedStudentGroups(updated, userId);

    if (userId) {
      enqueueCloudSync({
        userId,
        entityType: "combinedGroup",
        entityId: groupId,
        operation: "delete"
      }).catch(() => {});
    }
  },

  getLessons(userId?: string): Lesson[] {
    const key = getScopedKey("lessons", userId);
    return getItem<Lesson[]>(key, initialLessons);
  },

  saveLessons(lessons: Lesson[], userId?: string): void {
    const key = getScopedKey("lessons", userId);
    setItem(key, lessons || []);
  },

  deleteLesson(lessonId: string, userId?: string): void {
    const current = this.getLessons(userId);
    const updated = current.filter(l => l.id !== lessonId);
    this.saveLessons(updated, userId);

    if (userId) {
      enqueueCloudSync({
        userId,
        entityType: "lesson",
        entityId: lessonId,
        operation: "delete"
      }).catch(() => {});
    }
  },

  getExams(userId?: string): ExamRecord[] {
    const key = getScopedKey("examRecords", userId);
    return getItem<ExamRecord[]>(key, initialExams);
  },

  saveExams(exams: ExamRecord[], userId?: string): void {
    const key = getScopedKey("examRecords", userId);
    setItem(key, exams || []);
  },

  deleteExam(examId: string, userId?: string): void {
    const current = this.getExams(userId);
    const updated = current.filter(e => e.id !== examId);
    this.saveExams(updated, userId);

    if (userId) {
      enqueueCloudSync({
        userId,
        entityType: "exam",
        entityId: examId,
        operation: "delete"
      }).catch(() => {});
    }
  },

  // 7. Student Preferences
  getStudentReportPreferences(studentId: string, defaultTeacherName?: string): StudentReportPreferences {
    const key = `gostars_student_prefs_${studentId}`;
    return getItem<StudentReportPreferences>(key, {
      includeStudentName: true,
      includeTeacherName: true,
      teacherName: defaultTeacherName || "",
      includeLessonNumber: true,
      includeDuration: false,
      includeLessonDate: true,
      reportLanguage: "ar"
    });
  },

  saveStudentReportPreferences(studentId: string, prefs: StudentReportPreferences): void {
    const key = `gostars_student_prefs_${studentId}`;
    setItem(key, prefs);
  },

  // 8. Full Workspace export & import
  exportBackupJSON(userId?: string): GoStarsBackupData {
    return this.getUserWorkspace(userId);
  },

  restoreBackupJSON(data: GoStarsBackupData, userId?: string): boolean {
    try {
      this.saveUserWorkspace(userId || "", data);
      return true;
    } catch {
      return false;
    }
  },

  getUserWorkspace(userId?: string): GoStarsBackupData {
    return {
      version: "2.0",
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(userId),
      students: this.getStudents(userId),
      combinedStudentGroups: this.getCombinedStudentGroups(userId),
      groups: this.getGroups(userId),
      privateLessons: this.getPrivateLessons(userId),
      lessons: this.getLessons(userId),
      attendanceRecords: this.getAttendanceRecords(userId),
      examRecords: this.getExams(userId),
      paymentTransactions: this.getPayments(userId),
      reports: this.getReports(userId),
      deletedStudentIds: Array.from(this.getTombstones(userId))
    };
  },

  saveUserWorkspace(userId: string, data: GoStarsBackupData): void {
    if (Array.isArray(data.deletedStudentIds)) {
      data.deletedStudentIds.forEach(id => this.addTombstone(id, userId));
    }
    if (data.settings) this.saveSettings(data.settings, userId);
    if (data.students) this.saveStudents(data.students, userId);
    if (data.combinedStudentGroups) this.saveCombinedStudentGroups(data.combinedStudentGroups, userId);
    if (data.groups) this.saveGroups(data.groups, userId);
    if (data.privateLessons) this.savePrivateLessons(data.privateLessons, userId);
    if (data.lessons) this.saveLessons(data.lessons, userId);
    if (data.attendanceRecords) this.saveAttendanceRecords(data.attendanceRecords, userId);
    if (data.examRecords) this.saveExams(data.examRecords, userId);
    if (data.paymentTransactions) this.savePayments(data.paymentTransactions, userId);
    if (data.reports) this.saveReports(data.reports, userId);
  }
};
