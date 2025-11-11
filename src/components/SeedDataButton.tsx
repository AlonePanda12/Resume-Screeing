import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from 'lucide-react';

export function SeedDataButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSeedData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-demo-data');

      if (error) throw error;

      toast({
        title: 'Demo data loaded!',
        description: 'You can now sign in with the demo accounts.',
      });

      // Show credentials
      if (data?.credentials) {
        console.log('Demo credentials:', data.credentials);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading demo data',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSeedData}
      disabled={loading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <Database className="h-4 w-4" />
      {loading ? 'Loading...' : 'Load Demo Data'}
    </Button>
  );
}
