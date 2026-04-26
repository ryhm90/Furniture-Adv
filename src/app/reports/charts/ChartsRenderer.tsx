"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface ChartDataItem {
  label: string;
  value1: number;
  value2?: number;
  value3?: number;
}

interface ChartsRendererProps {
  chartData: ChartDataItem[];
  reportType: string;
  chartMargins: { top: number; right: number; left: number; bottom: number };
  formatLabel: (value: string) => string;
  formatNumber: (value: number) => string;
}

export default function ChartsRenderer({
  chartData,
  reportType,
  chartMargins,
  formatLabel,
  formatNumber,
}: ChartsRendererProps) {
  return (
    <ResponsiveContainer>
      {reportType === "comparative" ? (
        <LineChart data={chartData} margin={chartMargins}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tickFormatter={formatLabel} />
          <YAxis tickFormatter={formatNumber} />
          <Tooltip
            labelFormatter={formatLabel}
            formatter={(value: number) => formatNumber(value)}
          />
          <Legend />
          <Line type="monotone" dataKey="value1" stroke="#8884d8" name="Sales" />
          <Line type="monotone" dataKey="value2" stroke="#82ca9d" name="Expenses" />
          <Line type="monotone" dataKey="value3" stroke="#ff7300" name="Cost" />
        </LineChart>
      ) : reportType === "sales" || reportType === "expenses" ? (
        <BarChart data={chartData} margin={chartMargins}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tickFormatter={formatLabel} />
          <YAxis tickFormatter={formatNumber} />
          <Tooltip
            labelFormatter={formatLabel}
            formatter={(value: number) => formatNumber(value)}
          />
          <Legend />
          <Bar
            dataKey="value1"
            fill="#8884d8"
            name={reportType === "sales" ? "Sales" : "Expenses"}
          />
        </BarChart>
      ) : (
        <LineChart data={chartData} margin={chartMargins}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tickFormatter={formatLabel} />
          <YAxis tickFormatter={formatNumber} />
          <Tooltip
            labelFormatter={formatLabel}
            formatter={(value: number) => formatNumber(value)}
          />
          <Legend />
          <Line type="monotone" dataKey="value1" stroke="#8884d8" name="Value" />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
