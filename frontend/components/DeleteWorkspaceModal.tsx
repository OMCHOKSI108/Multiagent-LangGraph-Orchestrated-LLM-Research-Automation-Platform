import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';

interface DeleteWorkspaceModalProps {
  open: boolean;
  workspaceName: string;
  isDeleting?: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}

export const DeleteWorkspaceModal: React.FC<DeleteWorkspaceModalProps> = ({
  open,
  workspaceName,
  isDeleting = false,
  onCancel,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (!isDeleting) onCancel();
        }}
        aria-label="Close delete confirmation dialog"
      />
      <div className="relative z-[71] w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15 text-red-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Delete workspace?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{workspaceName}</span> will be permanently deleted with its chats, reports, and history.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">This action cannot be undone.</p>

        <div className="mt-6 flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
            className="h-10 px-4"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void onConfirm()}
            isLoading={isDeleting}
            className="h-10 px-4"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};
