import { useState, useEffect, useRef } from 'react';
import * as _appContext from '@builder.io/app-context';
import type { ApplicationContext } from '@builder.io/app-context';
import styles from './NotesTab.module.scss';

// @builder.io/app-context is a stub at build time; Builder.io provides
// the real implementation (with a .default property) at runtime.
const appState = (_appContext as unknown as { default: ApplicationContext }).default;

const NOTES_KEY = '_pluginNotes';

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Notes tab for the Builder.io content editor right panel.
 *
 * Registered via `Builder.register('editor.mainTab', ...)`, this tab lets
 * users write freeform notes on any content entry. Notes are stored in the
 * entry's data under the key `_pluginNotes` and persisted to Builder.io on
 * save, so they survive page reloads and are shared across team members.
 *
 * Renders an empty state when no content entry is open in the editor.
 */
export function NotesTab() {
  const content = appState?.designerState?.editingContentModel;
  const contentId = (content as any)?.id as string | undefined;

  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync notes whenever the active content entry changes
  useEffect(() => {
    const value = content?.data?.get?.(NOTES_KEY) ?? '';
    setNotes(typeof value === 'string' ? value : '');
    setSaved(false);
  }, [contentId]);

  const handleSave = async () => {
    if (!content || saving) return;
    setSaving(true);
    content.data.set(NOTES_KEY, notes);
    await appState.content.update(content);
    setSaving(false);
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2500);
  };

  if (!content) {
    return (
      <div className={cx(styles.container, styles.empty)}>
        <span className={styles.emptyMessage}>No content selected</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <p className={styles.label}>Notes</p>
      <textarea
        className={styles.textarea}
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved(false);
        }}
        placeholder="Add notes for this content entry..."
      />
      <div className={styles.footer}>
        <span className={cx(styles.status, saved && styles.visible)}>Saved</span>
        <button
          className={styles.button}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
