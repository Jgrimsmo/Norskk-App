import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { getAdminServices } from "@/lib/firebase/admin";
import { Collections } from "@/lib/firebase/collections";
import { DEFAULT_ROLE_TEMPLATES } from "@/lib/constants/permissions";
import type { EmployeeStatus } from "@/lib/types/time-tracking";

export const runtime = "nodejs";

const VALID_ROLES = new Set(DEFAULT_ROLE_TEMPLATES.map((r) => r.role));

interface InviteRequestBody {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: EmployeeStatus;
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

async function sendPasswordSetupEmail(email: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    return { sent: false, reason: "Missing NEXT_PUBLIC_FIREBASE_API_KEY" };
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestType: "PASSWORD_RESET",
        email,
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    return {
      sent: false,
      reason: errorBody?.error?.message || "Failed to send password reset email",
    };
  }

  return { sent: true as const };
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const { auth, db } = getAdminServices();

    console.log("[invite] verifying ID token...");
    const decoded = await auth.verifyIdToken(token);
    console.log("[invite] token verified, uid:", decoded.uid);

    console.log("[invite] reading requester employee doc...");
    const requesterSnap = await db
      .collection(Collections.EMPLOYEES)
      .doc(decoded.uid)
      .get();
    const requesterRole = String(requesterSnap.data()?.role || "").toLowerCase();
    console.log("[invite] requester role:", requesterRole);

    if (requesterRole !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = (await req.json()) as InviteRequestBody;

    const name = body.name?.trim() || "";
    const email = body.email?.trim().toLowerCase() || "";
    const phone = body.phone?.trim() || "";
    const role = body.role?.trim() || "Labourer";
    const status: EmployeeStatus = body.status === "inactive" ? "inactive" : "active";

    if (!name) return badRequest("Name is required");
    if (!email) return badRequest("Email is required");
    if (!VALID_ROLES.has(role)) return badRequest("Invalid role");

    let createdUid: string | null = null;

    try {
      const tempPassword = randomUUID();
      const createdUser = await auth.createUser({
        email,
        password: tempPassword,
        displayName: name,
        disabled: status === "inactive",
      });

      createdUid = createdUser.uid;

      await db.collection(Collections.EMPLOYEES).doc(createdUid).set({
        id: createdUid,
        uid: createdUid,
        name,
        email,
        phone,
        role,
        status,
        createdAt: new Date().toISOString(),
      });

      const emailResult = await sendPasswordSetupEmail(email);

      return NextResponse.json(
        {
          ok: true,
          uid: createdUid,
          emailSent: emailResult.sent,
          warning: emailResult.sent ? undefined : emailResult.reason,
        },
        { status: 201 }
      );
    } catch (err) {
      if (createdUid) {
        await Promise.allSettled([
          auth.deleteUser(createdUid),
          db.collection(Collections.EMPLOYEES).doc(createdUid).delete(),
        ]);
      }
      throw err;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to invite user";
    console.error("[invite] ERROR:", err);
    const normalized = message.toLowerCase();

    if (normalized.includes("email-already-exists")) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    if (normalized.includes("decoding firebase id token") || normalized.includes("id token")) {
      return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
