/**
 * Generic Firestore CRUD helpers.
 *
 * Every function works with a typed `id` field that maps to
 * the Firestore document ID.  We strip `id` on write and
 * inject it on read so the rest of the app never has to think
 * about Firestore internals.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import type { QueryConstraint } from "firebase/firestore";
export type { QueryConstraint };
import { db } from "@/lib/firebase/config";

// ── Helpers ──────────────────────────────────

/** Return the Firestore collection ref for a collection name */
export function colRef(path: string) {
  return collection(db, path);
}

/** Return a document ref */
export function docRef(path: string, id: string) {
  return doc(db, path, id);
}

// ── Generic CRUD ─────────────────────────────

/** Fetch all documents in a collection */
export async function getAll<T extends { id: string }>(
  path: string,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  const q = constraints.length
    ? query(colRef(path), ...constraints)
    : query(colRef(path));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

/** Fetch a single document by ID */
export async function getById<T extends { id: string }>(
  path: string,
  id: string
): Promise<T | null> {
  const snap = await getDoc(docRef(path, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T;
}

/**
 * Create or overwrite a document.
 * Uses the `id` from the object as the document ID.
 */
export async function create<T extends { id: string }>(
  path: string,
  data: T
): Promise<void> {
  const { id, ...rest } = data as T & DocumentData;
  await setDoc(docRef(path, id), rest);
}

/** Partial update of a document */
export async function update<T extends { id: string }>(
  path: string,
  id: string,
  data: Partial<Omit<T, "id">>
): Promise<void> {
  await updateDoc(docRef(path, id), data as DocumentData);
}

/** Delete a document */
export async function remove(path: string, id: string): Promise<void> {
  await deleteDoc(docRef(path, id));
}

/**
 * Subscribe to real-time updates for a collection.
 * Returns an unsubscribe function.
 */
export function subscribe<T extends { id: string }>(
  path: string,
  callback: (items: T[]) => void,
  ...constraints: QueryConstraint[]
): Unsubscribe {
  const q = constraints.length
    ? query(colRef(path), ...constraints)
    : query(colRef(path));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
    callback(items);
  });
}

/**
 * Subscribe to a single document.
 * Returns an unsubscribe function.
 */
export function subscribeDoc<T extends { id: string }>(
  path: string,
  id: string,
  callback: (item: T | null) => void
): Unsubscribe {
  return onSnapshot(docRef(path, id), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback({ id: snap.id, ...snap.data() } as T);
  });
}

// Re-export query helpers for convenience
export { where, orderBy };
