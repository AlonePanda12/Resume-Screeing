import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Briefcase, FileText, CheckCircle2, Globe } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface Stats {
  totalResumes: number;
  shortlistedCount: number;
  totalJobs: number;
  distinctCountries: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalResumes: 0,
    shortlistedCount: 0,
    totalJobs: 0,
    distinctCountries: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [resumesRes, jobsRes, countriesRes, shortlistedRes] = await Promise.all([
        supabase.from('resumes').select('id', { count: 'exact' }),
        supabase.from('jobs').select('id', { count: 'exact' }),
        supabase.from('resumes').select('country'),
        supabase.from('resumes').select('id', { count: 'exact' }).eq('stage', 'shortlisted'),
      ]);

      const countries = new Set(countriesRes.data?.map(r => r.country).filter(Boolean));

      setStats({
        totalResumes: resumesRes.count || 0,
        shortlistedCount: shortlistedRes.count || 0,
        totalJobs: jobsRes.count || 0,
        distinctCountries: countries.size,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Resumes', value: stats.totalResumes, icon: FileText, color: 'text-blue-600' },
    { title: 'Shortlisted', value: stats.shortlistedCount, icon: CheckCircle2, color: 'text-green-600' },
    { title: 'Total Jobs', value: stats.totalJobs, icon: Briefcase, color: 'text-purple-600' },
    { title: 'Countries', value: stats.distinctCountries, icon: Globe, color: 'text-orange-600' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent className="animate-pulse">
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your recruitment analytics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Uploads per Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Chart data will appear as resumes are added
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Chart data will appear as resumes are processed
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
