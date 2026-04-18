import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Card className="h-40 animate-pulse bg-white/5">
        <div />
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="h-32 animate-pulse bg-white/5">
            <div />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-80 animate-pulse bg-white/5 lg:col-span-2">
          <div />
        </Card>
        <Card className="h-80 animate-pulse bg-white/5">
          <div />
        </Card>
      </div>
    </div>
  );
}
