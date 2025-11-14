import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type UploadResult = {
  success?: boolean;
  score?: number;
  matched?: string[];
  resume?: { file_url?: string };
  error?: string;
};

interface Props {
  jdId?: string;
}

const ResumeUploader: React.FC<Props> = ({ jdId }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const JD_ID = jdId || "replace_with_real_jd_id_from_jobs_table";

  async function handleUpload(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!file) {
      alert("Please select a PDF or DOCX file first.");
      return;
    }
    if (!JD_ID || JD_ID === "replace_with_real_jd_id_from_jobs_table") {
      alert("Please set a valid job id (jdId) from the jobs table.");
      return;
    }

    const fd = new FormData();
    fd.append("resume", file);
    fd.append("jd_id", JD_ID);

    try {
      setLoading(true);
      setResult(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setResult({ error: "Please sign in to upload resumes." });
        setLoading(false);
        return;
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
      const resp = await fetch(`${backendUrl}/upload-resume`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: fd,
      });

      const data = await resp.json();
      setResult(data);
    } catch (err) {
      console.error("Upload error:", err);
      setResult({ error: "Upload failed. Check backend is running and CORS." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "30px auto", padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
      <h2 style={{ marginBottom: 12 }}>Upload Resume for Automatic Shortlisting</h2>

      <form onSubmit={handleUpload}>
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          style={{ display: "block", marginBottom: 12 }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "8px 14px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Uploading..." : "Upload & Get Score"}
        </button>
      </form>

      {/* Result area */}
      {result && (
        <div style={{ marginTop: 18 }}>
          {result.success ? (
            <div>
              <div style={{ color: "green", fontWeight: 600 }}>✅ Resume Analyzed</div>
              <div style={{ marginTop: 8 }}><strong>Score:</strong> {result.score}</div>
              <div style={{ marginTop: 6 }}>
                <strong>Matched Skills:</strong>{" "}
                {result.matched && result.matched.length ? result.matched.join(", ") : "None"}
              </div>
              {result.resume?.file_url && (
                <div style={{ marginTop: 8 }}>
                  <a href={result.resume.file_url} target="_blank" rel="noreferrer">View uploaded file</a>
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: "red", fontWeight: 600 }}>
              ❌ {result.error || "Analysis failed or server returned error."}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 12, color: "#666" }}>
        <small>Note: Backend must run at <code>http://localhost:4000</code> and accept <code>/upload-resume</code>.</small>
      </div>
    </div>
  );
};

export default ResumeUploader;
