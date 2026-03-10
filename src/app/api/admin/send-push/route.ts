import { NextRequest, NextResponse } from "next/server";
import { getAdminServices } from "@/lib/firebase/admin";
import { getMessaging } from "firebase-admin/messaging";

export const runtime = "nodejs";

/**
 * POST /api/admin/send-push
 *
 * Sends a push notification to one or more FCM tokens.
 * Called internally by the notification creation flow.
 *
 * Body: { tokens: string[], title: string, body: string, data?: Record<string, string> }
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const idToken = authHeader.replace("Bearer ", "");
    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { auth, db } = getAdminServices();

    // Verify the caller's identity
    let decoded;
    try {
      decoded = await auth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Verify caller exists in employees
    const callerDoc = await db.collection("employees").doc(decoded.uid).get();
    if (!callerDoc.exists) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { tokens, title, body, data } = await req.json();

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json({ error: "No tokens provided" }, { status: 400 });
    }

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const messaging = getMessaging();

    // Send to each token (sendEachForMulticast handles token-level failures)
    const response = await messaging.sendEachForMulticast({
      tokens: tokens.filter((t: unknown) => typeof t === "string" && t.length > 0),
      notification: { title, body: body ?? "" },
      data: data ?? {},
      webpush: {
        fcmOptions: {
          link: "/",
        },
      },
    });

    // Clean up stale tokens
    const staleTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (
        !resp.success &&
        resp.error &&
        (resp.error.code === "messaging/registration-token-not-registered" ||
          resp.error.code === "messaging/invalid-registration-token")
      ) {
        staleTokens.push(tokens[idx]);
      }
    });

    // Remove stale tokens from employee docs
    if (staleTokens.length > 0) {
      const empSnap = await db
        .collection("employees")
        .where("fcmToken", "in", staleTokens)
        .get();
      const batch = db.batch();
      empSnap.docs.forEach((doc) => {
        batch.update(doc.ref, { fcmToken: "" });
      });
      await batch.commit();
    }

    return NextResponse.json({
      success: response.successCount,
      failures: response.failureCount,
      staleTokensRemoved: staleTokens.length,
    });
  } catch (err) {
    console.error("[send-push] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
