import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";

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

async function sendInviteEmail(toEmail: string, toName: string, resetLink: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false as const, reason: "Missing RESEND_API_KEY" };
  }

  const resend = new Resend(apiKey);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#111827;padding:28px 40px;text-align:left;">
            <img src="https://www.norskkearthworks.ca/assets/img/norskk_landscaping_logo.png" alt="Norskk Earthworks" style="height:40px;display:block;" />
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 20px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">You're invited to Norskk.Cloud</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Hi ${toName}, your account has been created. Set your password to get started.</p>
            <a href="${resetLink}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:8px;">Set My Password</a>
          </td>
        </tr>
        <!-- Link fallback -->
        <tr>
          <td style="padding:20px 40px 8px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">Or copy this link into your browser:</p>
            <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;word-break:break-all;">${resetLink}</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 32px;border-top:1px solid #f3f4f6;margin-top:20px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">If you didn't expect this invitation, you can safely ignore this email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: "Norskk.Cloud <hello@norskk.cloud>",
    to: toEmail,
    subject: "You're invited to Norskk.Cloud — Set your password",
    html,
  });

  if (error) {
    return { sent: false as const, reason: error.message };
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

    const decoded = await auth.verifyIdToken(token);

    const requesterSnap = await db
      .collection(Collections.EMPLOYEES)
      .doc(decoded.uid)
      .get();
    const requesterRole = String(requesterSnap.data()?.role || "").toLowerCase();

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

      const resetLink = await auth.generatePasswordResetLink(email);
      const emailResult = await sendInviteEmail(email, name, resetLink);

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
