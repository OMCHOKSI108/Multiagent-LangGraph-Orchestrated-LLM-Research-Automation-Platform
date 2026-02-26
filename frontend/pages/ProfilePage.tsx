import React, { useEffect, useState } from 'react';
import { useResearchStore } from '../store';
import { Button } from '../components/ui/button';

export const ProfilePage = () => {
  const { user, updateProfile } = useResearchStore();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(user?.name || '');
  }, [user?.name]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === user?.name) return;

    setIsSaving(true);
    try {
      await updateProfile(trimmed);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-full bg-bg px-4 py-8 sm:px-6 lg:px-8 font-sans text-text">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-serif text-text">Profile</h1>
          <p className="mt-1 text-sm text-muted">
            Manage your account details.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-text">
                Name
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent"
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-text">
                Email
              </label>
              <input
                id="email"
                value={user?.email || ''}
                readOnly
                aria-readonly="true"
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-muted"
              />
              <p className="text-xs text-muted">
                Email address cannot be edited.
              </p>
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                isLoading={isSaving}
                disabled={!name.trim() || name.trim() === (user?.name || '').trim()}
                className="h-10 px-4"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
