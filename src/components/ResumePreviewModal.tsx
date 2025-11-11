import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  fileUrl?: string | null;
  name?: string;
};

export default function ResumePreviewModal({ open, onClose, fileUrl, name }: Props) {
  const isPdf = fileUrl?.toLowerCase().endsWith(".pdf");

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="max-w-5xl w-full h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Preview: {name || "Resume"}</span>
            {fileUrl ? (
              <Button asChild variant="outline" size="sm">
                <a href={fileUrl} target="_blank" rel="noreferrer">Open in new tab</a>
              </Button>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        <div className="w-full h-full border rounded-md overflow-hidden">
          {!fileUrl ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No file attached.
            </div>
          ) : isPdf ? (
            // Simple PDF preview. For DOC/DOCX we fall back to download/new tab.
            <iframe
              src={fileUrl}
              className="w-full h-full"
              title="Resume Preview"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-6">
              <p className="text-sm text-muted-foreground">
                Preview supports PDFs. This file type can be opened in a new tab or downloaded.
              </p>
              <div className="flex gap-2">
                <Button asChild>
                  <a href={fileUrl} target="_blank" rel="noreferrer">Open</a>
                </Button>
                <Button asChild variant="outline">
                  <a href={fileUrl} download>Download</a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
