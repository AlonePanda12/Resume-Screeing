import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Briefcase, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface Job {
  id: string;
  title: string;
  department: string | null;
  location_country: string | null;
  employment_type: string | null;
  required_skills: string[];
  visibility: string;
  created_at: string;
}

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading jobs',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Jobs</h1>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Job
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Jobs</h1>
          <p className="text-muted-foreground">Manage job descriptions and requirements</p>
        </div>
        <Button onClick={() => navigate('/jobs/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Job
        </Button>
      </div>

      {jobs.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No jobs yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first job description to start screening resumes
            </p>
            <Button onClick={() => navigate('/jobs/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Job
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <Card
              key={job.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/jobs/${job.id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span className="line-clamp-1">{job.title}</span>
                  <Badge variant={job.visibility === 'public' ? 'default' : 'secondary'}>
                    {job.visibility}
                  </Badge>
                </CardTitle>
                <CardDescription className="space-y-1">
                  {job.department && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-3 w-3" />
                      <span>{job.department}</span>
                    </div>
                  )}
                  {job.location_country && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <span>{job.location_country}</span>
                    </div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {job.required_skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {job.required_skills.slice(0, 5).map((skill, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {job.required_skills.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{job.required_skills.length - 5}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
