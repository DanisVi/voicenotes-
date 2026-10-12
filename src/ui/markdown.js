import { marked } from '../vendor/marked.esm.js';
import DOMPurify from '../vendor/purify.es.js';

marked.setOptions({
  breaks: true,
  gfm: true,
});

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'del', 'code', 'pre',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'hr', 'a',
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
  ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
};

export function renderMarkdown(text) {
  if (typeof text !== 'string' || text.length === 0) return '';
  try {
    const raw = marked.parse(text);
    return DOMPurify.sanitize(raw, SANITIZE_CONFIG);
  } catch (e) {
    console.error('renderMarkdown failed', e);
    return null;
  }
}
