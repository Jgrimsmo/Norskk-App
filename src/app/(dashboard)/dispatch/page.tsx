import DispatchBoard from "@/components/dispatch/dispatch-board";

export default function DispatchPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="shrink-0 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Dispatch
        </h1>
        <p className="text-muted-foreground">
          Assign crews, equipment, and materials to job sites.
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <DispatchBoard />
      </div>
    </div>
  );
}
