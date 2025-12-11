"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ImportLeadsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    success: number;
    errors: string[];
  } | null>(null);

  const supabaseClient = createClient();

  // Parse CSV (simple, assumes headers in first row)
  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const values = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/); // basic CSV split (handles quotes)
      const row: Record<string, string> = {};
      headers.forEach((header, i) => {
        row[header] = (values[i] || "").replace(/^"(.*)"$/, "$1").trim(); // remove surrounding quotes
      });
      return row;
    });
    return rows;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = parseCSV(text);
        setPreview(data.slice(0, 5)); // show first 5 for preview
      } catch (err) {
        alert("Failed to parse CSV");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);

    // Get current user + their department
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) {
      alert("Not logged in");
      return;
    }

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("department")
      .eq("id", user.id)
      .single();

    if (!profile) {
      alert("Your profile is missing department. Contact admin.");
      setImporting(false);
      return;
    }

    // Re-read file
    const text = await file.text();
    const rows = parseCSV(text);

    const requiredFields = ["name", "source"];
    const validRows: any[] = [];
    const errors: string[] = [];

    rows.forEach((row, idx) => {
      // Validate required
      const missing = requiredFields.filter(
        (f) => !row[f] || row[f].trim() === ""
      );
      if (missing.length > 0) {
        errors.push(
          `Row ${idx + 2}: Missing required fields: ${missing.join(", ")}`
        );
        return;
      }

      // Validate source
      const allowedSources = [
        "Upwork",
        "Freelancer",
        "Recruitment",
        "B2B",
        "Referral",
      ];
      if (!allowedSources.includes(row.source)) {
        errors.push(
          `Row ${idx + 2}: Invalid source "${
            row.source
          }". Must be one of: ${allowedSources.join(", ")}`
        );
        return;
      }

      // Map to DB schema
      validRows.push({
        name: row.name,
        company: row.company || null,
        email: row.email || null,
        upwork_id: row.upwork_id || null,
        linkedin_url: row.linkedin_url || null,
        source: row.source,
        industry: row.industry || null,
        description: row.description || null,
        status: row.status || "Applied",
        owner_id: user.id,
        department: profile.department,
      });
    });

    if (validRows.length === 0) {
      setResult({ success: 0, errors: ["No valid rows to import."] });
      setImporting(false);
      return;
    }

    // Batch insert (Supabase supports up to 1000 rows per insert)
    const { error } = await supabaseClient.from("leads").insert(validRows);

    if (error) {
      setResult({ success: 0, errors: [error.message] });
    } else {
      setResult({ success: validRows.length, errors });
    }

    setImporting(false);
  };

  const downloadTemplate = () => {
    // CSV content with headers + 2 example rows
    const template = `name,company,email,upwork_id,linkedin_url,source,industry,description,status
John Doe,Acme Inc,john@example.com,,https://linkedin.com/in/johndoe,B2B,SaaS,Looking for AI dev team,Applied
Jane Smith,,jane@startup.com,U12345678,,Upwork,Fintech,Needs full-stack dev for MVP,Conversation`;

    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "leads_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Import Leads (CSV)</h1>

      <div className="mb-6">
        <label className="block mb-2">Upload CSV File</label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="border p-2 w-full"
        />
      </div>

      <div className="mb-6">
        <button
          type="button"
          onClick={downloadTemplate}
          className="text-sm bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300"
        >
          📥 Download CSV Template
        </button>
      </div>

      {preview.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold mb-2">Preview (first 5 rows):</h2>
          <pre className="bg-gray-100 text-gray-800 p-4 text-sm overflow-auto max-h-40">
            {JSON.stringify(preview, null, 2)}
          </pre>
        </div>
      )}

      {result ? (
        <div
          className={`mb-6 p-4 ${
            result.success > 0 ? "bg-emerald-950" : "bg-rose-950"
          } rounded`}
        >
          <p>
            ✅ Successfully imported: <strong>{result.success}</strong> leads
          </p>
          {result.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-red-600">Errors:</p>
              <ul className="list-disc pl-5 text-sm">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          {result.success > 0 && (
            <Link
              href={"/leads"}
              className="mt-2 text-green-700 cursor-pointer hover:underline"
            >
              ← Click to go back to leads page
            </Link>
          )}
        </div>
      ) : (
        file && (
          <button
            onClick={handleImport}
            disabled={importing}
            className={`px-4 py-2 rounded ${
              importing ? "bg-gray-400" : "bg-blue-600 text-white"
            }`}
          >
            {importing ? "Importing..." : "Import Leads"}
          </button>
        )
      )}

      <div className="mt-8 text-sm text-gray-600">
        <h3 className="font-semibold mb-2">CSV Format Requirements:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>First row must be headers</li>
          <li>
            Required columns: <code>name</code>, <code>source</code>
          </li>
          <li>
            Optional: <code>company</code>, <code>email</code>,{" "}
            <code>upwork_id</code>, <code>linkedin_url</code>,{" "}
            <code>industry</code>, <code>description</code>, <code>status</code>
          </li>
          <li>
            Valid <code>source</code> values: Upwork, Freelancer, Recruitment,
            B2B, Referral
          </li>
          <li>
            Valid <code>status</code> (if provided): Applied, Conversation,
            Interview, Won, Lost
          </li>
        </ul>
      </div>
    </div>
  );
}
