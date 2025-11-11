// src/pages/History.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Clock, RefreshCw } from "lucide-react";

type Row = {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  details: any;
  created_at: string;
};

const ACTION_COLORS: Record<string, string> = {
  upload: "bg-blue-100 text-blue-800",
  create: "bg-blue-100 text-blue-800",
  move: "bg-amber-100 text-amber-800",
  bulk_update: "bg-amber-100 text-amber-800",
  bulk_delete: "bg-rose-100 text-rose-800",
  delete: "bg-rose-100 text-rose-800",
  shortlisted: "bg-emerald-100 text-emerald-800",
  reviewed: "bg-zinc-100 text-zinc-800",
  rejected: "bg-rose-100 text-rose-800",
};

const PAGE_SIZE = 20;

function timeAgo(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleString();
}

export default function History() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // filters
  const [typeFilter, setTypeFilter] = useState<
    "all" | "resume" | "job" | "pipeline"
  >("all");
  const [actionFilter, setActionFilter] = useState<
    | "all"
    | "upload"
    | "create"
    | "move"
    | "bulk_update"
    | "bulk_delete"
    | "reviewed"
    | "shortlisted"
    | "rejected"
  >("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setRows([]);
    setPage(0);
    setHasMore(true);
    void loadPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, actionFilter]);

  // live updates (INSERTs)
  useEffect(() => {
    const ch = supabase
      .channel("activity_log_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log" },
        // payload type dynamic: cast to any to avoid TS overload problems
        (payload: any) => {
          const newRow = payload?.new as Row | undefined;
          if (!newRow) return;
          setRows((prev) => [newRow, ...prev].slice(0, PAGE_SIZE * (page + 1)));
        }
      )
      .subscribe();

    return () => {
      // removeChannel is the recommended removal helper
      supabase.removeChannel(ch);
    };
  }, [page]);

  async function loadPage(p: number, replace = false) {
    try {
      setLoading(true);
      const from = p * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // cast the table query to `any` to avoid TypeScript schema mismatch errors
      let query: any = (supabase as any)
        .from("activity_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (typeFilter !== "all") query = query.eq("entity_type", typeFilter);
      if (actionFilter !== "all") query = query.eq("action", actionFilter);

      const { data, error, count } = await query;
      if (error) throw error;

      const pageRows = (data || []) as Row[];
      setRows((prev) => (replace ? pageRows : [...prev, ...pageRows]));

      const total = count ?? 0;
      const fetched = (replace ? 0 : rows.length) + pageRows.length;
      setHasMore(fetched < total);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Failed to load history",
        description: e?.message ?? String(e),
      });
    } finally {
      setLoading(false);
    }
  }

  const onLoadMore = async () => {
    const next = page + 1;
    setPage(next);
    await loadPage(next);
  };

  // local search filter
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const d = JSON.stringify(r.details || {}).toLowerCase();
      return (
        r.entity_type.toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q) ||
        (r.entity_id ?? "").toLowerCase().includes(q) ||
        d.includes(q)
      );
    });
  }, [rows, search]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">History</h1>
          <p className="text-muted-foreground">Your activity timeline</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search action, type, id, details…"
            className="w-[280px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-2">
            {/* Type filter */}
            {(["all", "resume", "job", "pipeline"] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={typeFilter === t ? "default" : "outline"}
                onClick={() => setTypeFilter(t)}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            {/* Action filter */}
            {(
              [
                "all",
                "upload",
                "create",
                "move",
                "bulk_update",
                "bulk_delete",
                "reviewed",
                "shortlisted",
                "rejected",
              ] as const
            ).map((a) => (
              <Button
                key={a}
                size="sm"
                variant={actionFilter === a ? "default" : "outline"}
                onClick={() => setActionFilter(a)}
              >
                {a.replace("_", " ")}
              </Button>
            ))}
          </div>
          <Button variant="outline" onClick={() => loadPage(0, true)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Timeline */}
      {visible.length === 0 ? (
        <Card className="h-64 flex flex-col items-center justify-center text-muted-foreground">
          <Clock className="mb-2 h-6 w-6" />
          <div className="font-medium">No activity yet</div>
          <div className="text-sm">Your actions will appear here as you use the system</div>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <Card key={r.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{r.entity_type}</Badge>
                  <Badge
                    className={ACTION_COLORS[r.action] ?? "bg-gray-100 text-gray-800"}
                  >
                    {r.action.replace("_", " ")}
                  </Badge>
                  {r.entity_id && (
                    <span className="text-xs text-muted-foreground">#{r.entity_id}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</div>
              </div>
              {r.details && Object.keys(r.details).length > 0 && (
                <pre className="mt-2 rounded bg-muted p-2 text-xs overflow-x-auto">
                  {JSON.stringify(r.details, null, 2)}
                </pre>
              )}
            </Card>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button onClick={onLoadMore} disabled={loading}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
