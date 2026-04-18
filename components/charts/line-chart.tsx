"use client";

import {
  LineChart as ReLineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

type Props = {
  data: { label: string; value: number }[];
  color?: string;
};

export function LineChart({ data, color = "#7c3aed" }: Props) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ReLineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="label" stroke="#9ba3b4" />
          <YAxis stroke="#9ba3b4" />
          <Tooltip
            contentStyle={{ background: "#0b0d14", border: "1px solid rgba(255,255,255,0.08)" }}
            labelStyle={{ color: "#fff" }}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={{ r: 4 }} />
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  );
}
