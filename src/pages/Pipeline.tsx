import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Mail, Phone, MapPin, Loader2 } from "lucide-react";

type Stage = "new" | "reviewed" | "shortlisted" | "rejected";

type Resume = {
  id: string;
  candidate_name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  extracted_skills: string[];
  match_score: number;
  stage: Stage;
  created_at: string;
};

const STAGES: { key: Stage; title: string; color: string }[] = [
  { key: "new",         title: "New",         color: "bg-blue-100 text-blue-800" },
  { key: "reviewed",    title: "Reviewed",    color: "bg-amber-100 text-amber-800" },
  { key: "shortlisted", title: "Shortlisted", color: "bg-emerald-100 text-emerald-800" },
  { key: "rejected",    title: "Rejected",    color: "bg-rose-100 text-rose-800" },
];

export default function Pipeline() {
  const { toast } = useToast();
  const [items, setItems] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("resumes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setItems((data || []) as Resume[]);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to load pipeline", description: e.message });
    } finally {
      setLoading(false);
    }
  }

  // Filter client side for now (keeps DnD simple)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) => {
      const skills = (r.extracted_skills || []).join(" ").toLowerCase();
      return (
        r.candidate_name?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q) ||
        skills.includes(q)
      );
    });
  }, [items, search]);

  // Group by stage for columns
  const columns: Record<Stage, Resume[]> = useMemo(() => {
    return STAGES.reduce((acc, s) => {
      acc[s.key] = filtered.filter((r) => r.stage === s.key);
      return acc;
    }, {} as Record<Stage, Resume[]>);
  }, [filtered]);

  // DnD: move between columns
  async function onDragEnd(result: DropResult) {
    const { draggableId, source, destination } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const fromStage = source.droppableId as Stage;
    const toStage = destination.droppableId as Stage;

    // optimistic UI
    setItems((prev) => {
      const next = [...prev];
      const idx = next.findIndex((r) => r.id === draggableId);
      if (idx >= 0) next[idx] = { ...next[idx], stage: toStage };
      return next;
    });

    // persist
    const { error } = await supabase
      .from("resumes")
      .update({ stage: toStage })
      .eq("id", draggableId);

    if (error) {
      // revert on error
      setItems((prev) => {
        const next = [...prev];
        const idx = next.findIndex((r) => r.id === draggableId);
        if (idx >= 0) next[idx] = { ...next[idx], stage: fromStage };
        return next;
      });
      toast({ variant: "destructive", title: "Move failed", description: error.message });
    } else {
      toast({ title: "Stage updated", description: `Moved to ${toStage}` });
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground">
            Manage candidates through the hiring pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            className="w-[260px]"
            placeholder="Search candidates / skills…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="outline" onClick={loadData}>Refresh</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading pipeline…
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {STAGES.map((stage) => (
              <Column
                key={stage.key}
                stage={stage}
                items={columns[stage.key]}
              />
            ))}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}

function Column({
  stage,
  items,
}: {
  stage: { key: Stage; title: string; color: string };
  items: Resume[];
}) {
  return (
    <div className="flex flex-col rounded-xl border bg-card">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Badge className={stage.color}>{stage.title}</Badge>
          <span className="text-xs text-muted-foreground">{items.length}</span>
        </div>
      </div>

      <Droppable droppableId={stage.key}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`p-3 min-h-[120px] transition-colors ${
              snapshot.isDraggingOver ? "bg-muted/60" : ""
            }`}
          >
            {items.length === 0 && (
              <div className="text-xs text-muted-foreground py-6 text-center border rounded-lg">
                Drop candidates here
              </div>
            )}
            {items.map((r, idx) => (
              <Draggable key={r.id} draggableId={r.id} index={idx}>
                {(dragProvided, snap) => (
                  <Card
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    className={`mb-3 p-3 shadow-sm hover:shadow-md transition-shadow ${
                      snap.isDragging ? "ring-2 ring-primary/40" : ""
                    }`}
                  >
                    <div className="font-medium line-clamp-1">
                      {r.candidate_name}
                    </div>
                    <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                      {r.email && (
                        <div className="truncate">
                          <Mail className="inline h-3 w-3 mr-1" />
                          {r.email}
                        </div>
                      )}
                      {r.phone && (
                        <div>
                          <Phone className="inline h-3 w-3 mr-1" />
                          {r.phone}
                        </div>
                      )}
                      {r.country && (
                        <div>
                          <MapPin className="inline h-3 w-3 mr-1" />
                          {r.country}
                        </div>
                      )}
                    </div>
                    {r.extracted_skills?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {r.extracted_skills.slice(0, 3).map((s, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            {s}
                          </Badge>
                        ))}
                        {r.extracted_skills.length > 3 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{r.extracted_skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </Card>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
