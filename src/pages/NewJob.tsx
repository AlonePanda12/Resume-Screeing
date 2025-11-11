import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function NewJob() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState(""); // we'll also send this as jd_text
  const [skills, setSkills] = useState("");
  const [loading, setLoading] = useState(false);

  const createJob = async () => {
    if (!title || !description) {
      toast({
        variant: "destructive",
        title: "Fields missing",
        description: "Title and description are required.",
      });
      return;
    }

    try {
      setLoading(true);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw new Error("Not logged in.");

      const skillArray =
        skills
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0) || [];

      // IMPORTANT: send jd_text to satisfy NOT NULL constraint
      const { data, error } = await supabase
        .from("jobs")
        .insert({
          owner_id: userData.user.id,
          title,
          company,
          location,
          description,
          jd_text: description,       // <<< fix
          required_skills: skillArray,
          status: "open",
        })
        .select("id")
        .single();

      if (error) throw error;

      toast({ title: "Job created", description: "New job has been added successfully!" });

      // go to details page (make sure you added /jobs/:id route)
      if (data?.id) navigate(`/jobs/${data.id}`);

      // reset (optional if navigating away)
      setTitle(""); setCompany(""); setLocation(""); setDescription(""); setSkills("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Create Job</h1>
      <Card>
        <CardHeader>
          <CardTitle>Job Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="font-medium">Job Title</label>
            <Input placeholder="e.g. Frontend Developer" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div>
            <label className="font-medium">Company</label>
            <Input placeholder="e.g. Google" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>

          <div>
            <label className="font-medium">Location</label>
            <Input placeholder="e.g. Bengaluru, India" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>

          <div>
            <label className="font-medium">Job Description</label>
            <Textarea
              placeholder="Write job responsibilities, requirements..."
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="font-medium">Required Skills (comma-separated)</label>
            <Input
              placeholder="e.g. React, Node.js, SQL"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
          </div>

          <Button onClick={createJob} disabled={loading}>
            {loading ? "Creating..." : "Create Job"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
