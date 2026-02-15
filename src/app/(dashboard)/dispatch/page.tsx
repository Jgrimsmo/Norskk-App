import DispatchBoard from "@/components/dispatch/dispatch-board";

export default function DispatchPage() {
  return (
    <div className="space-y-4 h-[calc(100vh-8rem)]">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Dispatch
        </h1>
        <p className="text-muted-foreground">
          Assign crews, equipment, and materials to job sites.
        </p>
      </div>

      <DispatchBoard />
    </div>
  );
}
