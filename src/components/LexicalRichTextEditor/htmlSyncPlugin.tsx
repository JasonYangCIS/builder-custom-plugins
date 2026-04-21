// Outbound sync: editor state → onChange(html).
//
// Note on round-trip stability: $generateHtmlFromNodes does not preserve every
// DOM subtlety from $generateNodesFromDOM. Whitespace, nested inline formatting,
// and non-standard attributes can differ after one round trip. Content authored
// in a different editor (e.g. Quill) may visibly change on first save here.
import { useEffect } from 'react';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateHtmlFromNodes } from '@lexical/html';

interface HtmlSyncPluginProps {
  onChangeRef: React.MutableRefObject<(html: string) => void>;
  lastEmittedHtmlRef: React.MutableRefObject<string>;
}

function isEmptyHtml(html: string): boolean {
  // Lexical serializes an empty editor as <p><br></p>. Collapse to '' so
  // Builder.io's required-field validation treats it as empty.
  const stripped = html.replace(/\s+/g, '');
  return stripped === '' || stripped === '<p><br></p>';
}

// Normalize serialized HTML for storage:
//   1. Strip SCSS-module class names (e.g. class="_ul_5e59f_156") — these
//      are our editor's internal theme classes and only exist in this
//      plugin's compiled CSS, so they'd be dead references on any site
//      rendering the stored content.
//   2. Strip `white-space: pre-wrap` from inline styles — Lexical wraps
//      every text run in <span style="white-space: pre-wrap;"> to preserve
//      authored whitespace, but for typical RTE content this is noise.
//   3. Unwrap <span> elements that have no remaining attributes.
function cleanOutputHtml(html: string): string {
  if (!html) return html;

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const body = doc.body;

  body.querySelectorAll('[class]').forEach((el) => {
    const kept = el.className
      .split(/\s+/)
      .filter((c) => c && !c.startsWith('_'));
    if (kept.length === 0) el.removeAttribute('class');
    else el.className = kept.join(' ');
  });

  body.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
    if (el.style.whiteSpace === 'pre-wrap') el.style.removeProperty('white-space');
    if (el.getAttribute('style') === '') el.removeAttribute('style');
  });

  body.querySelectorAll('span').forEach((span) => {
    if (span.attributes.length === 0 && span.parentNode) {
      while (span.firstChild) span.parentNode.insertBefore(span.firstChild, span);
      span.parentNode.removeChild(span);
    }
  });

  return body.innerHTML;
}

export function HtmlSyncPlugin({ onChangeRef, lastEmittedHtmlRef }: HtmlSyncPluginProps) {
  const [editor] = useLexicalComposerContext();

  // Emit an initial value on mount so parents that seed with content see
  // a canonical HTML echo (and so lastEmittedHtmlRef matches what we'd
  // produce from the current editor state).
  useEffect(() => {
    editor.getEditorState().read(() => {
      const raw = $generateHtmlFromNodes(editor);
      const cleaned = cleanOutputHtml(raw);
      lastEmittedHtmlRef.current = isEmptyHtml(cleaned) ? '' : cleaned;
    });
  }, [editor, lastEmittedHtmlRef]);

  return (
    <OnChangePlugin
      ignoreSelectionChange
      onChange={(editorState) => {
        editorState.read(() => {
          const raw = $generateHtmlFromNodes(editor);
          const cleaned = cleanOutputHtml(raw);
          const html = isEmptyHtml(cleaned) ? '' : cleaned;
          if (html === lastEmittedHtmlRef.current) return;
          lastEmittedHtmlRef.current = html;
          onChangeRef.current(html);
        });
      }}
    />
  );
}
