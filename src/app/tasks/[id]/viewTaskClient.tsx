"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Calendar,
  Pencil,
  Trash2,
  Eye,
  X,
} from "lucide-react";
import { Task as TaskType } from "../types";
import { createClient } from "@/lib/supabase/client";

type Task = TaskType & {
  owner_id: string;
  owner: { full_name: string; department: string };
};

export function ViewTaskClient({
  task,
  userId,
  canEdit,
}: {
  task: Task;
  userId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const handleOpenCancelModal = () => {
    setShowCancelModal(true);
  };

  const getTaskIcon = (type: string | null) => {
    switch (type) {
      case "Call":
        return <Phone className="w-5 h-5 text-blue-600" />;
      case "Email":
        return <Mail className="w-5 h-5 text-green-600" />;
      case "Message":
        return <MessageSquare className="w-5 h-5 text-purple-600" />;
      case "Proposal":
        return <FileText className="w-5 h-5 text-orange-600" />;
      default:
        return <Calendar className="w-5 h-5 text-gray-600" />;
    }
  };

  const getUrgencyInfo = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
        badge: "Overdue",
        color: "bg-red-100 text-red-800",
      };
    }
    if (diffDays === 0) {
      return {
        icon: <AlertCircle className="w-5 h-5 text-orange-500" />,
        badge: "Due Today",
        color: "bg-orange-100 text-orange-800",
      };
    }
    return {
      icon: <Clock className="w-5 h-5 text-gray-500" />,
      badge: `Due in ${diffDays} days`,
      color: "bg-blue-100 text-blue-800",
    };
  };

  const urgency = !!task.due_date && getUrgencyInfo(task.due_date);

  const handleComplete = async () => {
    setLoading(true);
    const supabaseClient = createClient();
    const { error } = await supabaseClient
      .from("tasks")
      .update({ status: "completed" })
      .eq("id", task.id);

    if (!error) {
      location.reload();
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      alert("Please provide a reason for cancellation.");
      return;
    }

    setLoading(true);
    const supabaseClient = createClient();
    const { error } = await supabaseClient
      .from("tasks")
      .update({
        status: "cancelled",
        cancel_reason: cancelReason,
      })
      .eq("id", task.id);

    if (!error) {
      location.reload();
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    setLoading(true);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.push("/tasks");
    }
    setLoading(false);
  };

  const statusBadge = () => {
    switch (task.status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 text-green-600">
            <CheckCircle2 className="w-4 h-4" /> Completed
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 text-red-600">
            <X className="w-4 h-4" /> Cancelled
          </span>
        );
      default:
        return <span>Pending</span>;
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {getTaskIcon(task.type)} {task.type} Task
          </h1>
          <p className="text-gray-600">ID: {task.id}</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            {task.status !== "cancelled" && (
              <Link
                href={`/tasks/${task.id}/edit`}
                className="p-2 bg-gray-600 rounded hover:bg-gray-300 cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
              </Link>
            )}
            {/* <button
              onClick={handleDelete}
              disabled={loading}
              className="p-2 bg-red-600 rounded hover:bg-red-300 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button> */}
          </div>
        )}
      </div>

      {/* Urgency Badge */}
      {!!urgency && (
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium mb-6 ${urgency.color} inline-flex justify-start gap-2`}
        >
          <span>{urgency.icon}</span>
          <span>{urgency.badge}</span>
        </div>
      )}
      {/* Task Details */}
      <div className="bg-gray-900 border rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-3">Task Info</h2>
            <p>
              <strong>Description:</strong> {task.description || "—"}
            </p>
            <p>
              <strong>Due Date:</strong>{" "}
              {!!task.due_date
                ? new Date(task.due_date).toLocaleDateString()
                : "-"}
            </p>
            <p>
              <strong>Status:</strong>
              {statusBadge()}
            </p>
            {task.status === "cancelled" && task.cancel_reason && (
              <p>
                <strong>Cancel Reason:</strong> {task.cancel_reason}
              </p>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">Owner</h2>
            <p>{task.owner.full_name || "—"}</p>
          </div>
        </div>
      </div>

      {/* Related Entity */}
      {(task.lead || task.deal) && (
        <div className="bg-gray-900 border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">Related To</h2>
          {task.lead && (
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-sky-400" />
              <Link
                href={`/leads/${task.lead_id}`}
                className="text-sky-400 hover:underline"
              >
                Lead: {task.lead.name}{" "}
                {task.lead.company ? `(${task.lead.company})` : ""}
              </Link>
            </div>
          )}
          {task.deal && (
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-400" />
              <Link
                href={`/deals/${task.deal_id}`}
                className="text-blue-400 hover:underline"
              >
                Deal: {task.deal.lead_name}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {canEdit && task.status != "cancelled" && task.status == "pending" && (
          <button
            onClick={handleComplete}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 cursor-pointer"
          >
            Mark as Complete
          </button>
        )}
        {canEdit && task.status === "pending" && (
          <button
            onClick={handleOpenCancelModal}
            className="bg-red-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-red-700"
          >
            Cancel Task
          </button>
        )}
        <Link
          href="/tasks"
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 cursor-pointer"
        >
          Back to Tasks
        </Link>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Cancel Task</h2>
            <p className="text-gray-600 mb-4">
              Please provide a reason for cancelling this task:
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g., Lead went silent, duplicate task, etc."
              className="w-full p-2 border rounded mb-4"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                disabled={loading || !cancelReason.trim()}
                className="flex-1 bg-red-600 text-white py-2 rounded cursor-pointer disabled:opacity-50"
              >
                {loading ? "Cancelling..." : "Confirm Cancellation"}
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 bg-gray-500 py-2 rounded cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
