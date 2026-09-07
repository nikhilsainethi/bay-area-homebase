'use client';
import { useRef, useState } from 'react';
import { Download, Upload, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { browserStore } from '@/lib/client';
import { STORAGE_KEY } from '@/lib/browser-store';
export default function BrowserTools({
  onChange,
  onNotice,
}: {
  onChange: () => Promise<void>;
  onNotice: (m: string) => void;
}) {
  const file = useRef<HTMLInputElement>(null),
    [settings, setSettings] = useState(false),
    [key, setKey] = useState(''),
    [error, setError] = useState('');
  function backup() {
    try {
      let data;
      try {
        data = browserStore().backup();
      } catch {
        data = localStorage.getItem(STORAGE_KEY) || '[]';
      }
      const url = URL.createObjectURL(
        new Blob([data], { type: 'application/json' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = `homebase-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onNotice('Backup downloaded');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      if (f.size > 5_000_000) throw new Error('Maximum backup size is 5 MB.');
      const result = browserStore().importBackup(await f.text());
      await onChange();
      onNotice(
        `Imported ${result.added} properties; kept ${result.skipped} existing records`,
      );
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (file.current) file.current.value = '';
    }
  }
  return (
    <>
      <div className="browser-tools">
        <Button variant="outline" onClick={backup}>
          <Download />
          Export
        </Button>
        <Button variant="outline" onClick={() => file.current?.click()}>
          <Upload />
          Import
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            try {
              setKey(localStorage.getItem('homebase:google-maps-key') || '');
              setSettings(true);
            } catch {
              setError('Browser storage is unavailable.');
            }
          }}
        >
          <Settings2 />
          Map settings
        </Button>
        <input
          type="file"
          ref={file}
          accept="application/json,.json"
          onChange={importFile}
          hidden
        />
      </div>
      {error && (
        <p role="alert" className="error-banner">
          {error}
          <button onClick={() => setError('')}>Dismiss</button>
        </p>
      )}
      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent className="map-settings">
          <DialogHeader>
            <DialogTitle>Use Google Maps</DialogTitle>
            <DialogDescription>
              Add your browser API key to switch from the free map to Google
              Maps. It stays in this browser and is excluded from backups.
            </DialogDescription>
          </DialogHeader>
          <label className="field" htmlFor="google-map-key">
            <span>Google Maps API key</span>
            <Input
              id="google-map-key"
              type="password"
              autoComplete="off"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Paste your API key"
            />
          </label>
          <p>
            Enable Maps JavaScript API and restrict your key to this site:{' '}
            <code>
              {typeof location !== 'undefined' ? location.origin + '/*' : ''}
            </code>
            . Google usage charges may apply. Apartment discovery continues to
            use OpenStreetMap.
          </p>
          <p>
            After changing a previously used Google key, reload the page to load
            the new key.
          </p>
          <Button
            onClick={() => {
              try {
                const value = key.trim();
                if (value && !/^[A-Za-z0-9_-]+$/.test(value))
                  throw new Error(
                    'Check the API key for spaces or invalid characters.',
                  );
                localStorage.setItem('homebase:google-maps-key', value);
                window.dispatchEvent(new Event('homebase-map-config'));
                setSettings(false);
                onNotice(
                  value
                    ? 'Google Maps key saved. Reload if replacing an existing key.'
                    : 'Free map selected',
                );
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            {key.trim() ? 'Save Google Maps key' : 'Use free map'}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
