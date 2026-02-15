/**
 * Firebase Storage helpers for file uploads.
 *
 * Usage:
 *   const url = await uploadFile(file, "daily-reports/dr-1/photo.jpg");
 *   const url = await uploadBase64(dataUrl, "safety/sf-1/signature.png");
 *   await deleteFile("daily-reports/dr-1/photo.jpg");
 */

import {
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";
import { storage } from "@/lib/firebase/config";

// ── Upload a File object ──────────────────────────────

export async function uploadFile(
  file: File,
  path: string
): Promise<string> {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type,
  });
  return getDownloadURL(snapshot.ref);
}

// ── Upload multiple files, returns array of download URLs ──

export async function uploadFiles(
  files: File[],
  basePath: string
): Promise<string[]> {
  const urls = await Promise.all(
    files.map((file, idx) => {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}-${idx}.${ext}`;
      return uploadFile(file, `${basePath}/${fileName}`);
    })
  );
  return urls;
}

// ── Upload a base64 data URL (e.g. from SignaturePad) ──

export async function uploadBase64(
  dataUrl: string,
  path: string
): Promise<string> {
  const storageRef = ref(storage, path);
  const snapshot = await uploadString(storageRef, dataUrl, "data_url");
  return getDownloadURL(snapshot.ref);
}

// ── Delete a single file by path ──────────────────────

export async function deleteFile(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

// ── Delete all files under a prefix ───────────────────

export async function deleteFolder(prefix: string): Promise<void> {
  const folderRef = ref(storage, prefix);
  const result = await listAll(folderRef);
  await Promise.all(result.items.map((item) => deleteObject(item)));
}
