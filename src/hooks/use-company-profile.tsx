"use client";

import * as React from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Collections } from "@/lib/firebase/collections";
import type { CompanyProfile } from "@/lib/types/time-tracking";

interface CompanyProfileContextValue {
  profile: CompanyProfile | null;
  loading: boolean;
}

const CompanyProfileContext = React.createContext<CompanyProfileContextValue>({
  profile: null,
  loading: true,
});

export function CompanyProfileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, setProfile] = React.useState<CompanyProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsub = onSnapshot(
      doc(db, Collections.COMPANY_PROFILE, "default"),
      (snap) => {
        if (snap.exists()) {
          setProfile({ id: snap.id, ...snap.data() } as CompanyProfile);
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  return (
    <CompanyProfileContext.Provider value={{ profile, loading }}>
      {children}
    </CompanyProfileContext.Provider>
  );
}

export function useCompanyProfile() {
  return React.useContext(CompanyProfileContext);
}
