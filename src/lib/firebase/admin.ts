import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

interface AdminServices {
  app: App;
  auth: ReturnType<typeof getAuth>;
  db: ReturnType<typeof getFirestore>;
}

let cachedServices: AdminServices | null = null;

function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  throw new Error(
    "Firebase Admin is not configured. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY."
  );
}

export function getAdminServices(): AdminServices {
  if (cachedServices) return cachedServices;

  const app = getAdminApp();
  cachedServices = {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
  };

  return cachedServices;
}
