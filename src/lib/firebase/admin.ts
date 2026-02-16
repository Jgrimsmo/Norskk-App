import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];

  // Use service account credentials if provided, otherwise use project ID
  // (works when deployed on Google Cloud / Vercel with GOOGLE_APPLICATION_CREDENTIALS)
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    return initializeApp({ credential: cert(serviceAccount) });
  }

  return initializeApp({ projectId });
}

export const adminApp = getAdminApp();
export const adminAuth = getAuth(adminApp);
