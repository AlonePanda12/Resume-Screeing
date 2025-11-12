import React, { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  onFilesChange?: (files: File[]) => void;
  accept?: string[];          // default: ['application/pdf']
  multiple?: boolean;         // default: true
  maxFiles?: number;          // default: 50
  maxSizeMB?: number;         // default: 10
  className?: string;
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024, sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export default function ResumeUploader({
  onFilesChange,
  accept = ["application/pdf"],
  multiple = true,
  maxFiles = 50,
  maxSizeMB = 10,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const acceptAttr = accept.join(",");

  const applyFiles = (incoming: File[]) => {
    // Filters
    const allowed = incoming.filter(f => {
      const typeOk = accept.includes(f.type) || accept.some(a => a === ".pdf" && f.name.toLowerCase().endsWith(".pdf"));
      const sizeOk = f.size <= maxSizeMB * 1024 * 1024;
      return typeOk && sizeOk;
    });

    // merge (no duplicates by name+size)
    const merged = [...files, ...allowed].filter((f, idx, arr) =>
      arr.findIndex(g => g.name === f.name && g.size === f.size) === idx
    );

    const limited = merged.slice(0, maxFiles);
    setFiles(limited);
    onFilesChange?.(limited);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    applyFiles(list);
    if (inputRef.current) inputRef.current.value = ""; // reset input
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const items = Array.from(e.dataTransfer.files || []);
    applyFiles(items);
  };

  const removeAt = (i: number) => {
    const next = files.filter((_, idx) => idx !== i);
    setFiles(next);
    onFilesChange?.(next);
  };

  const clearAll = () => {
    setFiles([]);
    onFilesChange?.([]);
  };

  const openPicker = useCallback(() => inputRef.current?.click(), []);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "w-full rounded-2xl border border-dashed p-6 text-center transition",
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptAttr}
          multiple={multiple}
          onChange={onPick}
          className="hidden"
        />
        <p className="text-sm text-muted-foreground">
          Drag & drop PDFs here, or
        </p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <Button size="sm" onClick={openPicker}>Choose PDF(s)</Button>
          <Badge variant="secondary">{files.length}/{maxFiles}</Badge>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Allowed: PDF • Max size: {maxSizeMB} MB per file
        </p>
      </div>

      {/* Selected list */}
      {files.length > 0 && (
        <div className="rounded-xl border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Selected files</p>
            <Button variant="ghost" size="sm" onClick={clearAll}>Clear all</Button>
          </div>
          <ul className="space-y-2">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(f.size)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">PDF</Badge>
                  <Button variant="ghost" size="sm" onClick={() => removeAt(i)}>Remove</Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
