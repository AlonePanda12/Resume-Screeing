// src/components/ResumeUploader.tsx
import React, { useState } from "react";

type UploadResult = {
  success?: boolean;
  score?: number;
  matched?: string[];
  resume?: { file_url?: string };
  error?: string;
};

interface Props {
  jdId?: string; // pass a real JD id or leave empty and replace below
}

const ResumeUploader: React.FC<Props> = ({ jdId }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  // If you don't pass jdId as prop, put a real JD id here (from Supabase job_descriptions table)
  const JD_ID = jdId || "replace_with_real_jd_id_from_supabase";

  async function handleUpload(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!file) {
      alert("Please select a PDF or DOCX file first.");
      return;
    }
    if (!JD_ID || JD_ID === "replace_with_real_jd_id_from_supabase") {
      alert("Please set a valid job description id (jdId).");
      return;
    }

    const fd = new FormData();
    fd.append("resume", file);
    fd.append("jd_id", JD_ID);

    try {
      setLoading(true);
      setResult(null);

      const resp = await fetch("http://localhost:4000/upload-resume", {
        method: "POST",
        body: fd,
      });

      // If server returned non-JSON, this may throw — handle gracefully
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
