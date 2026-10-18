/**
 * Safe Markdown-to-HTML Parser & Sanitizer
 * Designed to prevent Stored XSS attacks in authored and imported chapter content
 * without relying on external dependencies.
 */

/**
 * Escape dangerous HTML characters
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/on\w+\s*=/gi, 'data-blocked=');
}

/**
 * Validate URL to allow only safe http/https web links
 */
export function sanitizeUrl(url: string): string {
  const trimmed = (url || '').trim();
  if (/^(?:https?:\/\/|\/|#)/i.test(trimmed)) {
    return trimmed;
  }
  return '#'; // Block javascript:, data:, vbscript:, etc.
}

/**
 * Parse inline Markdown (bold, italic, code, links, strikethrough)
 */
function parseInlineMarkdown(text: string): string {
  let out = escapeHtml(text);

  // Inline code: `code`
  out = out.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-mono font-semibold text-brand-600 dark:text-brand-400">$1</code>');

  // Bold: **text** or __text__
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Strikethrough: ~~text~~
  out = out.replace(/~~([^~]+)~~/g, '<del class="text-slate-400">$1</del>');

  // Links: [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
    const safeHref = sanitizeUrl(url);
    return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 font-medium">${linkText}</a>`;
  });

  return out;
}

/**
 * Converts structured Markdown text to secure, styled HTML.
 * Completely neutralizes XSS payloads (e.g. `<script>`, `onerror=`, `javascript:`).
 */
export function renderSafeMarkdown(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') return '';

  // Completely strip executable tags and their inner content
  const cleanInput = markdown
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');

  const lines = cleanInput.split(/\r?\n/);
  const htmlParts: string[] = [];

  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' = 'ul';

  const closeList = () => {
    if (inList) {
      htmlParts.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced Code Block: ```
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        closeList();
        htmlParts.push(
          `<pre class="my-4 p-4 rounded-xl bg-slate-900 text-slate-100 overflow-x-auto text-xs sm:text-sm font-mono border border-slate-800"><code>${codeBlockLines.join('\n')}</code></pre>`
        );
        inCodeBlock = false;
        codeBlockLines = [];
      } else {
        closeList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(escapeHtml(line));
      continue;
    }

    const trimmed = line.trim();

    // Empty lines
    if (!trimmed) {
      closeList();
      continue;
    }

    // Headers
    if (trimmed.startsWith('# ')) {
      closeList();
      htmlParts.push(`<h1 class="text-2xl sm:text-3xl font-bold text-navy mt-6 mb-3">${parseInlineMarkdown(trimmed.slice(2))}</h1>`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      closeList();
      htmlParts.push(`<h2 class="text-xl sm:text-2xl font-bold text-navy mt-5 mb-2.5">${parseInlineMarkdown(trimmed.slice(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith('### ')) {
      closeList();
      htmlParts.push(`<h3 class="text-lg sm:text-xl font-bold text-navy mt-4 mb-2">${parseInlineMarkdown(trimmed.slice(4))}</h3>`);
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      closeList();
      htmlParts.push(`<h4 class="text-base sm:text-lg font-bold text-navy mt-3 mb-1.5">${parseInlineMarkdown(trimmed.slice(5))}</h4>`);
      continue;
    }

    // Blockquote: > text
    if (trimmed.startsWith('> ')) {
      closeList();
      htmlParts.push(
        `<blockquote class="my-3 pl-4 border-l-4 border-blue-500 italic text-slate-600 dark:text-slate-300 py-1 bg-slate-50 dark:bg-slate-800/50 rounded-r-lg">${parseInlineMarkdown(trimmed.slice(2))}</blockquote>`
      );
      continue;
    }

    // Unordered List: - text or * text
    if (/^[-*]\s+/.test(trimmed)) {
      if (!inList || listType !== 'ul') {
        closeList();
        inList = true;
        listType = 'ul';
        htmlParts.push('<ul class="my-3 pl-6 list-disc space-y-1.5 text-slate-700 dark:text-slate-300">');
      }
      htmlParts.push(`<li>${parseInlineMarkdown(trimmed.replace(/^[-*]\s+/, ''))}</li>`);
      continue;
    }

    // Ordered List: 1. text
    if (/^\d+\.\s+/.test(trimmed)) {
      if (!inList || listType !== 'ol') {
        closeList();
        inList = true;
        listType = 'ol';
        htmlParts.push('<ol class="my-3 pl-6 list-decimal space-y-1.5 text-slate-700 dark:text-slate-300">');
      }
      htmlParts.push(`<li>${parseInlineMarkdown(trimmed.replace(/^\d+\.\s+/, ''))}</li>`);
      continue;
    }

    // Image: ![alt](url)
    if (/^!\[([^\]]*)\]\(([^)]+)\)$/.test(trimmed)) {
      closeList();
      const match = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (match) {
        const alt = escapeHtml(match[1]);
        const src = sanitizeUrl(match[2]);
        htmlParts.push(
          `<figure class="my-4 text-center"><img src="${src}" alt="${alt}" class="max-w-full h-auto mx-auto rounded-lg shadow-sm border border-slate-200 dark:border-slate-800" loading="lazy" /><figcaption class="text-xs text-slate-500 mt-1">${alt}</figcaption></figure>`
        );
      }
      continue;
    }

    // Table rows: | col1 | col2 |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      closeList();
      const cells = trimmed.slice(1, -1).split('|').map(c => c.trim());
      // Check if separator line (e.g. |---|---|)
      if (cells.every(c => /^:?-+:?$/.test(c))) {
        continue;
      }
      const isHeader = i === 0 || (i > 0 && !lines[i-1].trim().startsWith('|'));
      const rowContent = cells
        .map(cell => `<td class="px-4 py-2 border border-slate-200 dark:border-slate-700">${parseInlineMarkdown(cell)}</td>`)
        .join('');
      htmlParts.push(`<tr class="border-b border-slate-200 dark:border-slate-800">${rowContent}</tr>`);
      continue;
    }

    // Standard Paragraph
    closeList();
    htmlParts.push(`<p class="my-3 text-slate-700 dark:text-slate-300 leading-relaxed">${parseInlineMarkdown(trimmed)}</p>`);
  }

  closeList();

  if (inCodeBlock && codeBlockLines.length > 0) {
    htmlParts.push(
      `<pre class="my-4 p-4 rounded-xl bg-slate-900 text-slate-100 overflow-x-auto text-xs sm:text-sm font-mono border border-slate-800"><code>${codeBlockLines.join('\n')}</code></pre>`
    );
  }

  // Wrap any contiguous table rows in table container
  let res = htmlParts.join('\n');
  res = res.replace(/(<tr[\s\S]*?<\/tr>)+/g, (match) => {
    return `<div class="overflow-x-auto my-4"><table class="w-full text-left border-collapse border border-slate-200 dark:border-slate-800 text-sm"><tbody>${match}</tbody></table></div>`;
  });

  return res;
}
