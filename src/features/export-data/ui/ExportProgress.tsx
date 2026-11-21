import { useSyncExternalStore } from 'react';
import type { ProgressStore } from '../model/progress-store';

/** The file name and how far the download has got, redrawn as the store changes. Lives inside a toast. */
export function ExportProgress({ filename, store }: { filename: string; store: ProgressStore }): React.JSX.Element {
  const progress = useSyncExternalStore(store.subscribe, store.get);
  return (
    <span className="block break-all">
      {filename}
      {progress ? ` · ${progress}` : ''}
    </span>
  );
}
