// app/dashboard/DashboardClient.tsx
"use client";

import { useState } from "react";
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
  Legend,
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
  // Add industry data (will come from server)
  won_deals_by_industry?: { industry: string; count: number; value: number }[];
  leads_by_industry?: { industry: string; count: number }[];
  team_leads: { rep_id: string; rep_name: string; leads_handled: number }[];
  team_deals: {
    rep_id: string;
    rep_name: string;
    deals_closed: number;
    total_value: number;
  }[];
  team_response: {
    rep_id: string;
    rep_name: string;
    avg_response_hours: number;
  }[];
};

const COLORS = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"];

export function DashboardClient({ metrics }: { metrics: Metric }) {
  const [activeTab, setActiveTab] = useState<"overview" | "insights" | "team">(
    "overview"
  );

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Sales Dashboard</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 font-medium cursor-pointer ${
            activeTab === "overview"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Sales Overview
        </button>
        <button
          onClick={() => setActiveTab("insights")}
          className={`px-4 py-2 font-medium cursor-pointer ${
            activeTab === "insights"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Industry Insights
        </button>
        <button
          onClick={() => setActiveTab("team")}
          className={`px-4 py-2 font-medium cursor-pointer ${
            activeTab === "team"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Team Performance
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <SalesOverview metrics={metrics} />}
      {activeTab === "insights" && <IndustryInsights metrics={metrics} />}
      {activeTab === "team" && <TeamPerformance metrics={metrics} />}
    </div>
  );
}

// --- SALES OVERVIEW (your existing UI) ---
function SalesOverview({ metrics }: { metrics: Metric }) {
  const leadData = metrics.active_leads.map((item) => ({
    name: item.source,
    leads: item.count,
  }));

  const dealData = metrics.deal_pipeline.map((item) => ({
    name: item.stage,
    deals: item.count,
    value: item.value,
  }));

  const revenueData = metrics.revenue_by_stream.map((item) => ({
    name: item.source,
    value: item.total_value,
  }));

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <KpiCard
          title="Overdue Tasks"
          value={metrics.task_summary.overdue}
          color="text-red-400"
        />
        <KpiCard
          title="Tasks Due Today"
          value={metrics.task_summary.due_today}
          color="text-orange-400"
        />
        <KpiCard
          title="Active Leads"
          value={metrics.active_leads.reduce(
            (sum, item) => sum + item.count,
            0
          )}
          color="text-blue-400"
        />
        <KpiCard
          title="Pipeline Value"
          value={`$${metrics.deal_pipeline
            .reduce((sum, item) => sum + item.value, 0)
            .toLocaleString()}`}
          color="text-green-400"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Active Leads by Source">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={leadData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip />
              <Bar dataKey="leads" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Deal Pipeline">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dealData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis
                dataKey="name"
                stroke="#999"
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis yAxisId="left" stroke="#999" />
              <YAxis yAxisId="right" orientation="right" stroke="#999" />
              <Tooltip
                formatter={(value, name) =>
                  name === "value"
                    ? [`$${Number(value).toLocaleString()}`, "Value"]
                    : [value, "Deals"]
                }
              />
              <Bar
                yAxisId="left"
                dataKey="deals"
                fill="#0ea5e9"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="right"
                dataKey="value"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue by Stream">
          {revenueData.some((item) => item.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueData}
                  cx="50%"
                  cy="50%"
                  labelLine
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name}: ${!!percent ? (percent * 100).toFixed(0) : 0}%`
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
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400">No revenue data</p>
          )}
        </ChartCard>

        <ChartCard title="Lead Status">
          <div className="space-y-3">
            {metrics.active_leads.map((item) => (
              <div key={item.source}>
                <div className="flex justify-between text-sm">
                  <span>{item.source}</span>
                  <span>{item.count}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 mt-1">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
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
        </ChartCard>
      </div>
    </>
  );
}

// --- INDUSTRY INSIGHTS ---
function IndustryInsights({ metrics }: { metrics: Metric }) {
  const wonDealsData =
    metrics.won_deals_by_industry?.map((item) => ({
      name: item.industry,
      deals: item.count,
      value: item.value,
    })) || [];

  const leadsByIndustry =
    metrics.leads_by_industry?.map((item) => ({
      name: item.industry,
      leads: item.count,
    })) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartCard title="Won Deals by Industry">
        {wonDealsData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={wonDealsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis
                dataKey="name"
                stroke="#999"
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis yAxisId="left" stroke="#999" />
              <YAxis yAxisId="right" orientation="right" stroke="#999" />
              <Tooltip
                formatter={(value, name) =>
                  name === "value"
                    ? [`$${Number(value).toLocaleString()}`, "Value"]
                    : [value, "Deals"]
                }
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="deals"
                name="Deals"
                fill="#8b5cf6"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="right"
                dataKey="value"
                name="Value ($)"
                fill="#ec4899"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-400">No won deals data</p>
        )}
      </ChartCard>

      <ChartCard title="Leads by Industry">
        {leadsByIndustry.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={leadsByIndustry}
                cx="50%"
                cy="50%"
                labelLine
                outerRadius={80}
                fill="#8884d8"
                dataKey="leads"
                nameKey="name"
                label={({ name, percent }) =>
                  `${name}: ${!!percent ? (percent * 100).toFixed(0) : 0}%`
                }
              >
                {leadsByIndustry.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, "Leads"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-400">No leads data</p>
        )}
      </ChartCard>
    </div>
  );
}

// --- TEAM PERFORMANCE (Placeholder) ---
function TeamPerformance({ metrics }: { metrics: Metric }) {
  // Combine all metrics by rep
  const repMap = new Map<string, any>();

  // Initialize all reps
  metrics.team_leads.forEach((rep) => {
    repMap.set(rep.rep_id, {
      rep_id: rep.rep_id,
      rep_name: rep.rep_name,
      leads_handled: rep.leads_handled,
      deals_closed: 0,
      total_value: 0,
      avg_response_hours: 0,
    });
  });

  // Add deals data
  metrics.team_deals.forEach((rep) => {
    if (repMap.has(rep.rep_id)) {
      const existing = repMap.get(rep.rep_id);
      repMap.set(rep.rep_id, {
        ...existing,
        deals_closed: rep.deals_closed,
        total_value: rep.total_value,
      });
    }
  });

  // Add response time
  metrics.team_response.forEach((rep) => {
    if (repMap.has(rep.rep_id)) {
      const existing = repMap.get(rep.rep_id);
      repMap.set(rep.rep_id, {
        ...existing,
        avg_response_hours: rep.avg_response_hours,
      });
    }
  });

  const teamData = Array.from(repMap.values());

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-700">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 uppercase">
              Rep
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-400 uppercase">
              Leads Handled
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-400 uppercase">
              Deals Closed
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-400 uppercase">
              Pipeline Value
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-400 uppercase">
              Avg Response (hrs)
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {teamData.length > 0 ? (
            teamData.map((rep) => (
              <tr key={rep.rep_id} className="hover:bg-gray-850">
                <td className="px-4 py-3 whitespace-nowrap text-gray-200">
                  {rep.rep_name}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-300">
                  {rep.leads_handled}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-300">
                  {rep.deals_closed}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-300">
                  ${rep.total_value.toLocaleString()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-300">
                  {rep.avg_response_hours > 0 ? rep.avg_response_hours : "–"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                No team performance data available
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Legend */}
      <div className="mt-6 text-sm text-gray-500">
        <p>
          💡 <strong>Response time</strong>: Manually entered by reps when
          updating lead status (MVP)
        </p>
      </div>
    </div>
  );
}

// --- Reusable Components ---
function KpiCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
      <div className="text-sm text-gray-400">{title}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
      <h2 className="text-lg font-semibold mb-4 text-gray-200">{title}</h2>
      {children}
    </div>
  );
}
