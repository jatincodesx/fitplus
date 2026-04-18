"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { weightLogSchema } from "@/lib/validators";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

type FormInput = z.input<typeof weightLogSchema>;
type FormValues = z.output<typeof weightLogSchema>;

export function WeightLogForm() {
  const router = useRouter();
  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(weightLogSchema),
    defaultValues: { date: new Date(), weightKg: 0 },
  });

  const onSubmit = async (values: FormValues) => {
    const res = await fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      router.refresh();
      form.reset({ ...values, weightKg: 0 });
    } else {
      alert("Could not log weight");
    }
  };

  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
      <Input type="date" {...form.register("date", { valueAsDate: true })} />
      <Input type="number" step="0.1" placeholder="Weight (kg)" {...form.register("weightKg", { valueAsNumber: true })} />
      <Button type="submit" className="w-full">
        Log weight
      </Button>
    </form>
  );
}
