import type { App } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";

let _app: App | null = null;
let _auth: Auth | null = null;

/** Lazily initializes Firebase Admin — only runs at runtime, never at build time */
export async function getAdminAuth(): Promise<Auth> {
  if (_auth) return _auth;

  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");

  if (getApps().length > 0) {
    _app = getApps()[0];
  } else {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      _app = initializeApp({ credential: cert(serviceAccount) });
    } else {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      _app = initializeApp({ projectId });
    }
  }

  _auth = getAuth(_app);
  return _auth;
}
