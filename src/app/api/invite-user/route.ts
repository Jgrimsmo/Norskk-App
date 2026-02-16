import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";

/**
 * POST /api/invite-user
 *
 * Admin-only endpoint that:
 * 1. Creates a Firebase Auth account for the invited user
 * 2. Sends them a password-reset email so they can set their own password
 *
 * Body: { email, displayName }
 * Auth: Bearer token (must be authenticated)
 */
export async function POST(req: NextRequest) {
  try {
    const { email, displayName } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    try {
      await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Create the Firebase Auth user with a random temporary password
    const tempPassword = crypto.randomUUID();
    const userRecord = await adminAuth.createUser({
      email,
      password: tempPassword,
      displayName: displayName || email.split("@")[0],
    });

    // Generate a password-reset link so the user can set their own password
    const resetLink = await adminAuth.generatePasswordResetLink(email);

    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
      resetLink,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Failed to invite user:", message);

    // Handle duplicate email
    if (message.includes("already exists")) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
