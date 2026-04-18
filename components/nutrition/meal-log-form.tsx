"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { mealLogSchema } from "@/lib/validators";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

type FormInput = z.input<typeof mealLogSchema>;
type FormValues = z.output<typeof mealLogSchema>;

export function MealLogForm() {
  const router = useRouter();
  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(mealLogSchema),
    defaultValues: {
      date: new Date(),
      mealType: "LUNCH",
      calories: 0,
    },
  });

  const onSubmit = async (values: FormValues) => {
    const res = await fetch("/api/meal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      router.refresh();
      form.reset({ ...values, calories: 0, notes: "" });
    } else {
      alert("Could not save meal");
    }
  };

  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
      <Input type="date" {...form.register("date", { valueAsDate: true })} />
      <Select {...form.register("mealType")}>
        <option value="BREAKFAST">Breakfast</option>
        <option value="LUNCH">Lunch</option>
        <option value="DINNER">Dinner</option>
        <option value="SNACK">Snack</option>
      </Select>
      <Input type="number" placeholder="Calories" {...form.register("calories", { valueAsNumber: true })} />
      <Input type="number" placeholder="Protein (g)" {...form.register("protein", { valueAsNumber: true })} />
      <Textarea placeholder="Notes" rows={2} {...form.register("notes")} />
      <Button type="submit" className="w-full">
        Log meal
      </Button>
    </form>
  );
}
