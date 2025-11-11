import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Item = { file_url?: string | null; candidate_name?: string | null };

type Props = {
  open: boolean;
  onClose: () => void;
  left?: Item | null;
  right?: Item | null;
};

export default function CompareResumesModal({ open, onClose, left, right }: Props) {
  const isPdf = (url?: string | null) => (url || "").toLowerCase().endsWith(".pdf");

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="max-w-6xl w-full h-[85vh]">
        <DialogHeader>
          <DialogTitle>Compare Resumes</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
          {[left, right].map((item, idx) => (
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
                  <iframe
                    src={item.file_url}
                    className="w-full h-full"
                    title={`Resume ${idx + 1}`}
                  />
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
  );
}
