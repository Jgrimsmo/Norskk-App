"use client";

import * as React from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Collections } from "@/lib/firebase/collections";

/**
 * Dynamically sets the browser tab favicon to the company logo stored in
 * Firestore. Falls back to the default Next.js favicon when no logo is set.
 *
 * This component listens directly to Firestore so it works regardless of
 * whether CompanyProfileProvider is mounted (e.g. on auth pages).
 */
export function DynamicFavicon() {
  React.useEffect(() => {
    const unsub = onSnapshot(
      doc(db, Collections.COMPANY_PROFILE, "default"),
      (snap) => {
        const logoUrl = snap.exists()
          ? (snap.data()?.logoUrl as string | undefined)
          : undefined;

        // Remove any existing dynamic favicon
        const existing = document.querySelector<HTMLLinkElement>(
          'link[data-dynamic-favicon]'
        );

        if (logoUrl) {
          if (existing) {
            existing.href = logoUrl;
          } else {
            const link = document.createElement("link");
            link.rel = "icon";
            link.type = "image/png";
            link.href = logoUrl;
            link.setAttribute("data-dynamic-favicon", "true");
            document.head.appendChild(link);
          }
        } else {
          // No logo — remove dynamic link so the default kicks in
          existing?.remove();
        }
      }
    );

    return () => unsub();
  }, []);

  return null;
}
