import type { EditorThemeClasses } from 'lexical';
import styles from './LexicalRichTextEditor.module.scss';

export const theme: EditorThemeClasses = {
  paragraph: styles.paragraph,
  heading: {
    h1: styles.h1,
    h2: styles.h2,
    h3: styles.h3,
  },
  list: {
    ul: styles.ul,
    ol: styles.ol,
    listitem: styles.li,
  },
  link: styles.link,
  text: {
    bold: styles.bold,
    italic: styles.italic,
    underline: styles.underline,
  },
  quote: styles.quote,
};
