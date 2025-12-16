// app/tasks/TasksClient.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Task = {
  id: string;
  type: string;
  description: string | null;
  due_date: string;
  completed: boolean;
  owner_id: string;
  profiles: { full_name: string } | null;
  leads: { name: string; company: string | null } | null;
  deals: { name: string } | null;
};

export function TasksClient({
  initialTasks,
  currentView,
  role,
  userId,
}: {
  initialTasks: {
    overdue: Task[];
    dueToday: Task[];
    upcoming: Task[];
  };
  currentView: "my" | "team";
  role: string;
  userId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleViewChange = (view: "my" | "team") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    router.push(`/tasks?${params.toString()}`);
  };

  const TaskList = ({ tasks }: { tasks: Task[] }) => (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div key={task.id} className="p-3 border rounded bg-white">
          <div className="flex justify-between">
            <span className="inline-block px-2 py-1 bg-gray-200 rounded text-sm mr-2">
              {task.type}
            </span>
            {currentView === "team" && task.owner_id !== userId && (
              <span className="text-xs text-gray-500">
                {task.profiles?.full_name}
              </span>
            )}
          </div>
          <strong>{task.description || "No description"}</strong>
          <div className="text-sm text-gray-600 mt-1">
            {task.leads?.name || task.deals?.name || "Standalone"}
            {task.leads?.company && ` • ${task.leads.company}`}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2 rolling in the deep font-bold">Tasks</h1>

        {/* View Toggle */}
        <div className="flex bg-gray-200 rounded">
          <button
            onClick={() => handleViewChange("my")}
            className={`px-4 py-2 text-sm font-medium rounded-l ${
              currentView === "my" ? "bg-white shadow" : "text-gray-700"
            }`}
          >
            My Tasks
          </button>
          {role === "manager" && (
            <button
              onClick={() => handleViewChange("team")}
              className={`px-4 py-2 text-sm font-medium rounded-r ${
                currentView === "team" ? "bg-white shadow" : "text-gray-700"
              }`}
            >
              Team Tasks
            </button>
          )}
        </div>
      </div>

      {/* Overdue */}
      {initialTasks.overdue.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-red-600 mb-2">
            ⚠️ Overdue
          </h2>
          <TaskList tasks={initialTasks.overdue} />
        </div>
      )}

      {/* Due Today */}
      {initialTasks.dueToday.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-orange-600 mb-2">
            📅 Due Today
          </h2>
          <TaskList tasks={initialTasks.dueToday} />
        </div>
      )}

      {/* Upcoming */}
      {initialTasks.upcoming.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            🔜 Upcoming
          </h2>
          <TaskList tasks={initialTasks.upcoming} />
        </div>
      )}

      {initialTasks.overdue.length === 0 &&
        initialTasks.dueToday.length === 0 &&
        initialTasks.upcoming.length === 0 && (
          <p className="text-gray-500">
            {currentView === "my"
              ? "No tasks yet. Create one from a lead or deal!"
              : "No team tasks found."}
          </p>
        )}
    </div>
  );
}
