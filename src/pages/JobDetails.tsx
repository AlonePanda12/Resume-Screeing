import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Job = {
  id: string;
  title: string | null;
  company: string | null;
  location: string | null;
  jd_text: string | null;              // your NOT NULL earlier—adjust if needed
  description: string | null;
  required_skills: string[] | null;
  status: string | null;
  created_at: string | null;
};

export default function JobDetails() {
  const { id } = useParams();
  const { toast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", id)
          .single();
        if (error) throw error;
        setJob(data as Job);
      } catch (e: any) {
        toast({ variant: "destructive", title: "Error loading job", description: e.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, toast]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!job) return <div className="p-6">Job not found.</div>;

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{job.title || "Untitled job"}</span>
            {job.status && <Badge variant="outline">{job.status}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {job.company && <div><b>Company:</b> {job.company}</div>}
          {job.location && <div><b>Location:</b> {job.location}</div>}
          {job.required_skills?.length ? (
            <div className="flex flex-wrap gap-1">
              {job.required_skills.map((s, i) => (
                <Badge key={i} variant="secondary">{s}</Badge>
              ))}
            </div>
          ) : null}
          {job.jd_text && (
            <div className="prose max-w-none">
              <h3 className="font-semibold mt-2 mb-1">Job Description</h3>
              <p className="whitespace-pre-wrap">{job.jd_text}</p>
            </div>
          )}
          {!job.jd_text && job.description && (
            <div className="prose max-w-none">
              <h3 className="font-semibold mt-2 mb-1">Description</h3>
              <p className="whitespace-pre-wrap">{job.description}</p>
            </div>
          )}

          {/* optional actions */}
          <div className="pt-2 flex gap-2">
            <Button variant="outline" onClick={() => history.back()}>Back</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
