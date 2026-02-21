"use client";

import * as React from "react";
import { Building2 } from "lucide-react";

import { VendorsTable } from "@/components/vendors/vendors-table";
import { useFirestoreState } from "@/hooks/use-firestore-state";
import { Collections } from "@/lib/firebase/collections";
import { type Vendor } from "@/lib/types/time-tracking";
import { Skeleton } from "@/components/ui/skeleton";
import { SavingIndicator } from "@/components/shared/saving-indicator";
import { RequirePermission } from "@/components/require-permission";

export default function VendorsPage() {
  const [vendors, setVendors, loading, saving] = useFirestoreState<Vendor>(Collections.VENDORS);

  return (
    <RequirePermission permission="vendors.view">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Vendors
            </h1>
            <p className="text-muted-foreground">
              Manage vendors and subcontractors.
            </p>
          </div>
          <SavingIndicator saving={saving} />
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Total Vendors
            </div>
            <div className="mt-1 text-2xl font-bold">{vendors.length}</div>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Vendors
            </div>
            <div className="mt-1 text-2xl font-bold">
              {vendors.filter((v) => v.type === "vendor").length}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Subcontractors
            </div>
            <div className="mt-1 text-2xl font-bold">
              {vendors.filter((v) => v.type === "subcontractor").length}
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : (
          <VendorsTable vendors={vendors} onVendorsChange={setVendors} />
        )}
      </div>
    </RequirePermission>
  );
}
