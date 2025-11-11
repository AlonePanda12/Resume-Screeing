import { useEffect, useMemo, useRef, useState } from 'react';
import { RESUME_BUCKET } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import {
  Plus, FileText, Mail, Phone, MapPin,
  CheckCircle2, Undo2, XCircle, CheckSquare, Eye, Columns
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { logActivity } from "@/lib/activity";

type Stage = 'new' | 'reviewed' | 'shortlisted' | 'rejected';

type Resume = {
  id: string;
  owner_id?: string;
  candidate_name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  extracted_skills: string[];
  match_score: number;
  stage: Stage;
  visibility: string;
  created_at: string;
  file_url?: string | null;
};

const stageColors: Record<Stage, string> = {
  new: 'bg-blue-100 text-blue-800',
  reviewed: 'bg-yellow-100 text-yellow-800',
  shortlisted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const PAGE_SIZE = 12;

async function resolveFileUrl(pathOrUrl: string) {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('http')) return pathOrUrl;
  const pub = supabase.storage.from(RESUME_BUCKET).getPublicUrl(pathOrUrl).data.publicUrl;
  if (pub) return pub;
  const signed = await supabase.storage.from(RESUME_BUCKET).createSignedUrl(pathOrUrl, 60 * 60);
  return signed.data?.signedUrl || '';
}

export default function Resumes() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStage, setFilterStage] =
    useState<'all' | 'new' | 'reviewed' | 'shortlisted' | 'rejected'>('all');

  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // debounced search
  const [rawSearch, setRawSearch] = useState('');
  const [search, setSearch] = useState('');

  // preview & compare
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<Resume | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  // debounce input
  useEffect(() => {
    const id = setTimeout(() => setSearch(rawSearch), 250);
    return () => clearTimeout(id);
  }, [rawSearch]);

  // reset & load on stage/search change
  useEffect(() => {
    setPage(0);
    setResumes([]);
    setHasMore(true);
    setSelected(new Set());
    void loadResumes(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStage, search]);

  const loadResumes = async (pageIndex: number, replace = false) => {
    try {
      setLoading(true);

      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('resumes')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filterStage !== 'all') {
        query = query.eq('stage', filterStage);
      }

      // server-side search on scalar text columns (arrays are handled client-side)
      if (search.trim() !== '') {
        const q = search.trim();
        query = query.or(
          `candidate_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const rows = (data || []) as Resume[];
      setResumes(prev => (replace ? rows : [...prev, ...rows]));

      const total = count ?? 0;
      const fetchedSoFar = (replace ? 0 : page * PAGE_SIZE) + rows.length;
      setHasMore(fetchedSoFar < total);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error loading resumes', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const onLoadMore = async () => {
    const next = page + 1;
    setPage(next);
    await loadResumes(next);
  };

  // client-side pass to include skills substring matching
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return resumes;
    return resumes.filter(r => {
      const name = r.candidate_name?.toLowerCase() || '';
      const email = r.email?.toLowerCase() || '';
      const phone = r.phone?.toLowerCase() || '';
      const skills = (r.extracted_skills || []).join(' ').toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        skills.includes(q)
      );
    });
  }, [resumes, search]);

  // bulk selections
  const selectedIds = Array.from(selected);
  const visibleIds = filtered.map(r => r.id);
  const hasSelection = selectedIds.length > 0;
  const canCompare = selectedIds.length === 2;
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selected.has(id));

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const copy = new Set(prev);
      copy.has(id) ? copy.delete(id) : copy.add(id);
      return copy;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelected(prev => {
      const copy = new Set(prev);
      if (allVisibleSelected) visibleIds.forEach(id => copy.delete(id));
      else visibleIds.forEach(id => copy.add(id));
      return copy;
    });
  };

  // ---------- ACTIVITY-AWARE MUTATIONS ----------
  const refreshFirstPage = async () => {
    setPage(0);
    setResumes([]);
    setHasMore(true);
    await loadResumes(0, true);
  };

  const bulkUpdate = async (newStage: Stage, message: string) => {
    try {
      const { error } = await supabase.from('resumes').update({ stage: newStage }).in('id', selectedIds);
      if (error) throw error;

      // log activity
      await logActivity({
        entity_type: "resume",
        action: "bulk_update",
        details: { to: newStage, count: selectedIds.length, ids: selectedIds }
      });

      toast({ title: message, description: `${selectedIds.length} updated.` });
      setSelected(new Set());
      await refreshFirstPage();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Action failed', description: e.message });
    }
  };

  const updateOne = async (r: Resume, to: Stage, label: string) => {
    try {
      const { error } = await supabase.from('resumes').update({ stage: to }).eq('id', r.id);
      if (error) throw error;

      await logActivity({
        entity_type: "resume",
        entity_id: r.id,
        action: "update_stage",
        details: { from: r.stage, to, name: r.candidate_name }
      });

      toast({ title: label, description: `${r.candidate_name} → ${to}` });
      await refreshFirstPage();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update failed', description: e.message });
    }
  };

  const bulkShortlist = () => bulkUpdate('shortlisted', 'Shortlisted');
  const bulkReviewed  = () => bulkUpdate('reviewed', 'Moved to Reviewed');
  const bulkReject    = () => bulkUpdate('rejected', 'Rejected');

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} resumes?`)) return;
    try {
      const { error } = await supabase.from('resumes').delete().in('id', selectedIds);
      if (error) throw error;

      await logActivity({
        entity_type: "resume",
        action: "bulk_delete",
        details: { count: selectedIds.length, ids: selectedIds }
      });

      toast({ title: 'Deleted', description: `${selectedIds.length} resumes removed.` });
      setSelected(new Set());
      await refreshFirstPage();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Delete failed', description: e.message });
    }
  };

  // upload
  const onClickUpload = () => fileInputRef.current?.click();

  const onFileChosen: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Max 15 MB allowed.' });
      return;
    }

    setUploading(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) throw new Error('Not authenticated');

      const path = `${userData.user.id}/${Date.now()}_${file.name}`;
      const upload = await supabase.storage.from(RESUME_BUCKET).upload(path, file);
      if (upload.error) throw upload.error;

      const url = await resolveFileUrl(path);
      const baseName = file.name.replace(/\.[^.]+$/, '');

      const { data: inserted, error: insErr } = await supabase
        .from('resumes')
        .insert({
          owner_id: userData.user.id,
          candidate_name: baseName,
          file_url: url,
          stage: 'new',
          extracted_skills: [],
          raw_text: null,
        })
        .select()
        .single();
      if (insErr) throw insErr;

      await logActivity({
        entity_type: "resume",
        entity_id: inserted.id,
        action: "upload",
        details: { name: baseName, size: file.size, type: file.type }
      });

      toast({ title: 'Resume uploaded', description: file.name });
      await refreshFirstPage();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload failed', description: err.message });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // preview & compare
  const openPreview = (r: Resume) => {
    setPreviewItem(r);
    setPreviewOpen(true);
  };

  const isPdf = (url?: string | null) => (url || '').toLowerCase().endsWith('.pdf');

  const openCompare = () => {
    if (!canCompare) return;
    setCompareOpen(true);
  };

  const selectedLeft  = filtered.find(r => r.id === selectedIds[0]) || null;
  const selectedRight = filtered.find(r => r.id === selectedIds[1]) || null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Resumes</h1>
          <p className="text-muted-foreground">Search, preview, compare and manage resumes</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <Input
            placeholder="Search by name, email, phone, or skill…"
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            className="w-[260px]"
          />

          {/* Stage filter chips */}
          {['all', 'new', 'reviewed', 'shortlisted', 'rejected'].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filterStage === s ? 'default' : 'outline'}
              onClick={() => setFilterStage(s as any)}
              className="rounded-full"
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}

          {/* Compare — only when 2 selected */}
          {canCompare && (
            <Button variant="outline" onClick={openCompare} className="rounded-full" title="Compare two selected resumes">
              <Columns className="mr-2 h-4 w-4" />
              Compare (2)
            </Button>
          )}

          {/* Upload */}
          <Button onClick={onClickUpload} disabled={uploading} className="rounded-full">
            <Plus className="mr-2 h-4 w-4" />
            Upload
          </Button>
          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={onFileChosen} />
        </div>
      </div>

      {/* Bulk Action Bar */}
      {hasSelection && (
        <div className="flex flex-wrap gap-2 p-3 border rounded-xl bg-card shadow-sm">
          <span className="text-sm">Selected: <b>{selectedIds.length}</b></span>

          <Button size="sm" onClick={bulkShortlist}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Shortlist
          </Button>

          <Button size="sm" variant="outline" onClick={bulkReviewed}>
            <Undo2 className="mr-2 h-4 w-4" />
            Reviewed
          </Button>

          <Button size="sm" variant="destructive" onClick={bulkReject}>
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>

          <Button size="sm" variant="destructive" onClick={bulkDelete}>
            <XCircle className="mr-2 h-4 w-4" />
            Delete
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={toggleSelectAllVisible}>
              <CheckSquare className="mr-2 h-4 w-4" />
              {allVisibleSelected ? 'Unselect All' : 'Select All'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center rounded-2xl border-dashed">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-semibold text-lg">No resumes found</p>
          <p className="text-sm text-muted-foreground">Upload a PDF or DOCX to get started.</p>
          <div className="mt-4">
            <Button onClick={onClickUpload} className="rounded-full">
              <Plus className="mr-2 h-4 w-4" /> Upload
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((resume) => (
              <Card key={resume.id} className="rounded-2xl border shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={selected.has(resume.id)}
                        onChange={() => toggleSelect(resume.id)}
                      />
                      <span className="font-medium line-clamp-1">{resume.candidate_name}</span>
                    </label>
                    <Badge className={stageColors[resume.stage]}>{resume.stage}</Badge>
                  </div>

                  <CardDescription className="mt-2 space-y-1">
                    {resume.email && <p className="truncate"><Mail className="inline h-3 w-3 mr-1" /> {resume.email}</p>}
                    {resume.phone && <p><Phone className="inline h-3 w-3 mr-1" /> {resume.phone}</p>}
                    {resume.country && <p><MapPin className="inline h-3 w-3 mr-1" /> {resume.country}</p>}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  {resume.match_score > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Match Score: <b className="text-foreground">{resume.match_score}%</b>
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {resume.extracted_skills.slice(0, 4).map((s, i) => (
                      <Badge key={i} variant="outline" className="rounded-full text-xs">
                        {s}
                      </Badge>
                    ))}
                    {resume.extracted_skills.length > 4 && (
                      <Badge variant="outline" className="rounded-full text-xs">+{resume.extracted_skills.length - 4}</Badge>
                    )}
                  </div>

                  <div className="pt-1 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openPreview(resume)} className="rounded-full">
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </Button>

                    {resume.stage !== 'shortlisted' ? (
                      <Button
                        size="sm"
                        className="rounded-full"
                        onClick={() => updateOne(resume, 'shortlisted', 'Shortlisted')}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Shortlist
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-full"
                        onClick={() => updateOne(resume, 'reviewed', 'Moved to Reviewed')}
                      >
                        <Undo2 className="mr-2 h-4 w-4" />
                        Reviewed
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button onClick={onLoadMore} disabled={loading}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={(o) => (!o ? setPreviewOpen(false) : null)}>
        <DialogContent className="max-w-5xl w-full h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Preview: {previewItem?.candidate_name || 'Resume'}</span>
              {previewItem?.file_url ? (
                <Button asChild variant="outline" size="sm">
                  <a href={previewItem.file_url} target="_blank" rel="noreferrer">Open in new tab</a>
                </Button>
              ) : null}
            </DialogTitle>
          </DialogHeader>
          <div className="w-full h-full border rounded-md overflow-hidden">
            {!previewItem?.file_url ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No file attached.
              </div>
            ) : isPdf(previewItem.file_url) ? (
              <iframe src={previewItem.file_url} className="w-full h-full" title="Resume Preview" />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-6">
                <p className="text-sm text-muted-foreground">
                  Preview supports PDFs. This file can be opened or downloaded.
                </p>
                <div className="flex gap-2">
                  <Button asChild><a href={previewItem.file_url} target="_blank" rel="noreferrer">Open</a></Button>
                  <Button asChild variant="outline"><a href={previewItem.file_url} download>Download</a></Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Compare Modal */}
      <Dialog open={compareOpen} onOpenChange={(o) => (!o ? setCompareOpen(false) : null)}>
        <DialogContent className="max-w-6xl w-full h-[85vh]">
          <DialogHeader>
            <DialogTitle>Compare Resumes</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
            {[selectedLeft, selectedRight].map((item, idx) => (
              <div key={idx} className="flex flex-col border rounded-md overflow-hidden">
                <div className="px-3 py-2 border-b font-medium">
                  {item?.candidate_name || `Resume ${idx + 1}`}
                </div>
                <div className="flex-1">
                  {!item?.file_url ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      No file.
                    </div>
                  ) : isPdf(item.file_url) ? (
                    <iframe src={item.file_url} className="w-full h-full" title={`Resume ${idx + 1}`} />
                  ) : (
                    <div className="h-full flex items-center justify-center p-4 text-center text-sm text-muted-foreground">
                      This file isn’t a PDF. Open from the card’s “Preview” action.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
