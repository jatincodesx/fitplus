import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Card className="h-48 animate-pulse bg-white/5">
        <div />
      </Card>
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="h-72 animate-pulse bg-white/5">
            <div />
          </Card>
        ))}
      </div>
    </div>
  );
}
