"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { Deal, Task } from "../types";
import { format, isBefore } from "date-fns";

export function TasksAndActivityLog({
  deal,
  initialData = { tasks: [] },
}: {
  deal: Deal;
  initialData: {
    tasks: Task[];
  };
}) {
  const taskTypes = ["Call", "Email", "Message", "Proposal", "Follow-up"];

  const [newTask, setNewTask] = useState({
    type: "Email" as const,
    description: "",
    due_date: "",
  });
  const [creatingTask, setCreatingTask] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(initialData.tasks);

  const fetchTasks = () => {
    const supabaseClient = createClient();
    supabaseClient
      .from("tasks")
      .select(
        "id, type, description, due_date, completed, created_at, lead:lead_id(id, name, company, source), deal:deal_id(id, owner_name, lead_name, lead_company),owner:owner_id(full_name)"
      )
      .eq("deal_id", deal.id)
      .then(({ data: tasks }) => {
        setTasks((tasks as unknown as Task[]) || []);
      });
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingTask(true);

    const supabaseClient = createClient();
    const { data: user } = await supabaseClient.auth.getUser();
    const { error, data: task } = await supabaseClient.from("tasks").insert({
      type: newTask.type,
      description: newTask.description || null,
      due_date: newTask.due_date,
      completed: false,
      deal_id: deal.id,
      owner_id: user.user?.id,
    });

    if (!error) {
      setNewTask({ type: "Email", description: "", due_date: "" });
      fetchTasks();
    }
    setCreatingTask(false);
  };

  return (
    <>
      {/* Tasks Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Tasks & Follow-ups</h2>
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleTaskSubmit} className="mb-6 p-4 border rounded">
          <h3 className="font-medium mb-2">Add Quick Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={newTask.type}
              onChange={(e) =>
                setNewTask({ ...newTask, type: e.target.value as any })
              }
              className="border p-2"
            >
              {taskTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={newTask.due_date}
              onChange={(e) =>
                setNewTask({ ...newTask, due_date: e.target.value })
              }
              className="border p-2"
              required
            />
            <button
              type="submit"
              disabled={creatingTask}
              className="bg-blue-600 text-white p-2 rounded"
            >
              {creatingTask ? "Adding..." : "Add"}
            </button>
          </div>
          <textarea
            placeholder="Description (optional)"
            value={newTask.description}
            onChange={(e) =>
              setNewTask({ ...newTask, description: e.target.value })
            }
            className="border p-2 mt-2 w-full"
            rows={2}
          />
        </form>

        {/* Task List */}
        {tasks.length === 0 ? (
          <p className="text-gray-500">No tasks yet.</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`p-3 border rounded flex justify-between items-start ${
                  task.completed
                    ? "bg-emerald-900"
                    : !!task.due_date &&
                      isBefore(new Date(task.due_date), new Date())
                    ? "bg-rose-900"
                    : "bg-gray-800"
                }`}
              >
                <div>
                  <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-900 rounded mr-2">
                    {task.type}
                  </span>
                  <span className="text-gray-200">
                    {task.description || "No description"}
                  </span>
                  <div className="text-sm text-gray-300 mt-1">
                    Due:{" "}
                    {!!task.due_date
                      ? format(new Date(task.due_date), "MMM d, yyyy")
                      : "-"}
                  </div>
                </div>
                <div>
                  {task.completed ? (
                    <span className="text-gray-200">✅ Done</span>
                  ) : !!task.due_date &&
                    isBefore(new Date(task.due_date), new Date()) ? (
                    <span className="text-gray-200">⚠️ Overdue</span>
                  ) : (
                    <span className="text-gray-200">Upcoming</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Feed */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Activity Feed</h2>
        {tasks.length === 0 ? (
          <p className="text-gray-500">No activity yet.</p>
        ) : (
          <div className="space-y-3">
            {[...tasks]
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              )
              .map((task) => (
                <div
                  key={task.id}
                  className="p-3 border-l-4 border-blue-500 bg-gray-900"
                >
                  <p>
                    <strong>{task.type}</strong> created for{" "}
                    {deal.lead_name || deal.name} by - {task.owner?.full_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(task.created_at), "MMM d, yyyy HH:mm")}
                  </p>
                  {task.description && (
                    <p className="mt-1">{task.description}</p>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </>
  );
}
