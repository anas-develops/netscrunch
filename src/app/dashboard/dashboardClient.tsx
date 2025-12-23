// app/dashboard/DashboardClient.tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type Metric = {
  active_leads: { source: string; count: number }[];
  deal_pipeline: { stage: string; count: number; value: number }[];
  task_summary: { overdue: number; due_today: number };
  revenue_by_stream: {
    source: string;
    active_leads: number;
    won_deals: number;
    total_value: number;
  }[];
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export function DashboardClient({ metrics }: { metrics: Metric }) {
  // Leads by Source
  const leadData = metrics.active_leads.map((item) => ({
    name: item.source,
    leads: item.count,
  }));

  // Deal Pipeline
  const dealData = metrics.deal_pipeline.map((item) => ({
    name: item.stage,
    deals: item.count,
    value: item.value,
  }));

  // Revenue by Stream
  const revenueData = metrics.revenue_by_stream.map((item) => ({
    name: item.source,
    value: item.total_value,
  }));

  console.log(revenueData);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Sales Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900 p-4 rounded shadow">
          <h3 className="text-gray-400">Overdue Tasks</h3>
          <p className="text-2xl font-bold text-red-600">
            {metrics.task_summary.overdue}
          </p>
        </div>
        <div className="bg-gray-900 p-4 rounded shadow">
          <h3 className="text-gray-400">Tasks Due Today</h3>
          <p className="text-2xl font-bold text-orange-600">
            {metrics.task_summary.due_today}
          </p>
        </div>
        <div className="bg-gray-900 p-4 rounded shadow">
          <h3 className="text-gray-400">Active Leads</h3>
          <p className="text-2xl font-bold">
            {metrics.active_leads.reduce((sum, item) => sum + item.count, 0)}
          </p>
        </div>
        <div className="bg-gray-900 p-4 rounded shadow">
          <h3 className="text-gray-400">Pipeline Value</h3>
          <p className="text-2xl font-bold">
            $
            {metrics.deal_pipeline
              .reduce((sum, item) => sum + item.value, 0)
              .toLocaleString()}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Source */}
        <div className="bg-gray-900 text-gray-400 p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Active Leads by Source</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={leadData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="leads" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Deal Pipeline */}
        <div className="bg-gray-900 text-gray-400 p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Deal Pipeline</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dealData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                formatter={(value, name) =>
                  name === "value"
                    ? [`$${Number(value).toLocaleString()}`, "Value"]
                    : [value, "Deals"]
                }
              />
              <Bar yAxisId="left" dataKey="deals" fill="#82ca9d" />
              <Bar yAxisId="right" dataKey="value" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Stream */}
        <div className="bg-gray-900 text-gray-400 p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Revenue by Stream</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueData}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, value }) =>
                  `${name}: $${value.toLocaleString()}`
                }
              >
                {revenueData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [
                  `$${Number(value).toLocaleString()}`,
                  "Revenue",
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Status Breakdown (Optional) */}
        <div className="bg-gray-900 text-gray-400 p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Lead Status</h2>
          {/* You can add another chart here */}
          <div className="space-y-2">
            {metrics.active_leads.map((item) => (
              <div key={item.source}>
                <div className="flex justify-between">
                  <span>{item.source}</span>
                  <span>{item.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${
                        (item.count /
                          Math.max(
                            ...metrics.active_leads.map((x) => x.count),
                            1
                          )) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
