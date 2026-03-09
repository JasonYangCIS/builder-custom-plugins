import { useState, useEffect, useRef } from 'react';
import * as _appContext from '@builder.io/app-context';
import type { ApplicationContext } from '@builder.io/app-context';

// @builder.io/app-context is a stub at build time; Builder.io provides
// the real implementation (with a .default property) at runtime.
const appState = (_appContext as unknown as { default: ApplicationContext }).default;

const NOTES_KEY = '_pluginNotes';

const styles = {
  container: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
    height: '100%',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#333',
    margin: 0,
  },
  textarea: {
    flex: 1,
    resize: 'none' as const,
    padding: '8px 10px',
    fontSize: 13,
    lineHeight: 1.5,
    border: '1px solid #ddd',
    borderRadius: 4,
    fontFamily: 'inherit',
    color: '#333',
    outline: 'none',
    minHeight: 120,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  status: (saved: boolean) => ({
    fontSize: 12,
    color: saved ? '#2e7d32' : 'transparent',
    transition: 'color 0.2s',
  }),
  button: (saving: boolean) => ({
    padding: '7px 16px',
    background: '#1565c0',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: saving ? 'not-allowed' : 'pointer',
    fontSize: 13,
    fontWeight: 500,
    opacity: saving ? 0.7 : 1,
    transition: 'opacity 0.15s',
  }),
} as const;

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
      <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#999' }}>No content selected</span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <p style={styles.label}>Notes</p>
      <textarea
        style={styles.textarea}
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved(false);
        }}
        placeholder="Add notes for this content entry..."
      />
      <div style={styles.footer}>
        <span style={styles.status(saved)}>Saved</span>
        <button
          style={styles.button(saving)}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
