import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../../');
const DOCS_DIR = path.join(ROOT_DIR, 'docs/ebooks');
const ARTIFACT_DIR = '/home/harsha/.gemini/antigravity-ide/brain/651141cd-1942-4961-ad67-66a54539bfed';

function getWordHtmlWrapper(title, bodyContent) {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: A4 portrait;
      margin: 1in;
    }
    body {
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      font-size: 20pt;
      font-weight: 800;
      color: #0B1D3A;
      border-bottom: 2.5pt solid #2563EB;
      padding-bottom: 6pt;
      margin-top: 0;
      margin-bottom: 12pt;
    }
    h2 {
      font-size: 14pt;
      font-weight: 700;
      color: #0B1D3A;
      border-bottom: 1pt solid #cbd5e1;
      padding-bottom: 4pt;
      margin-top: 18pt;
      margin-bottom: 8pt;
      page-break-after: avoid;
    }
    h3 {
      font-size: 12pt;
      font-weight: 700;
      color: #1e3a8a;
      margin-top: 14pt;
      margin-bottom: 6pt;
      page-break-after: avoid;
    }
    p, li {
      font-size: 10.5pt;
      line-height: 1.55;
      margin-bottom: 6pt;
    }
    ul, ol {
      margin-top: 2pt;
      margin-bottom: 8pt;
      padding-left: 20pt;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 10pt 0 14pt 0;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }
    th, td {
      border: 1pt solid #cbd5e1;
      padding: 6pt 8pt;
      text-align: left;
      vertical-align: top;
    }
    th {
      background-color: #f1f5f9;
      font-weight: 700;
      color: #0B1D3A;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    pre {
      background: #0B1D3A;
      color: #f8fafc;
      padding: 10pt;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 9pt;
      border-radius: 4pt;
      overflow-x: auto;
      line-height: 1.4;
      margin: 8pt 0;
    }
    code {
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 9pt;
      background: #f1f5f9;
      padding: 1.5pt 3pt;
      border-radius: 2pt;
      color: #0f172a;
    }
    pre code {
      background: transparent;
      padding: 0;
      color: inherit;
    }
    blockquote {
      border-left: 3.5pt solid #2563EB;
      margin: 8pt 0 10pt 0;
      padding: 6pt 12pt;
      background: #eff6ff;
      color: #1e3a8a;
      font-size: 10pt;
      border-radius: 0 4pt 4pt 0;
    }
    hr {
      border: 0;
      border-top: 1pt solid #e2e8f0;
      margin: 16pt 0;
    }
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

function getPdfHtmlWrapper(title, bodyContent) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 1.5cm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.55;
      color: #0f172a;
      max-width: 900px;
      margin: 0 auto;
      padding: 10px;
    }
    h1 {
      font-size: 18pt;
      font-weight: 800;
      color: #0B1D3A;
      border-bottom: 2px solid #2563EB;
      padding-bottom: 6px;
      margin-top: 0;
      margin-bottom: 12px;
      page-break-after: avoid;
    }
    h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #0B1D3A;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-top: 18px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }
    h3 {
      font-size: 11pt;
      font-weight: 700;
      color: #1e3a8a;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }
    p, li {
      font-size: 9.5pt;
      line-height: 1.5;
      margin-bottom: 6px;
    }
    ul, ol {
      margin-top: 2px;
      margin-bottom: 8px;
      padding-left: 20px;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 8px 0 12px 0;
      font-size: 8.5pt;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 5px 7px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background-color: #f1f5f9;
      font-weight: 700;
      color: #0B1D3A;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    pre {
      background: #0B1D3A;
      color: #f8fafc;
      padding: 8px 10px;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 8pt;
      border-radius: 4px;
      overflow-x: auto;
      line-height: 1.35;
      margin: 8px 0;
      page-break-inside: avoid;
    }
    code {
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 8.5pt;
      background: #f1f5f9;
      padding: 1px 3px;
      border-radius: 2px;
      color: #0f172a;
    }
    pre code {
      background: transparent;
      padding: 0;
      color: inherit;
    }
    blockquote {
      border-left: 3px solid #2563EB;
      margin: 8px 0;
      padding: 6px 10px;
      background: #eff6ff;
      color: #1e3a8a;
      font-size: 9pt;
      border-radius: 0 4px 4px 0;
    }
    hr {
      border: 0;
      border-top: 1px solid #e2e8f0;
      margin: 14px 0;
    }
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

function processDocument(baseName, title) {
  const mdPath = path.join(DOCS_DIR, `${baseName}.md`);
  console.log(`Processing ${mdPath}...`);

  // 1. Convert Markdown to HTML body using npx marked
  const rawHtml = execSync(`npx -y marked -i "${mdPath}"`).toString();

  // 2. Generate Word .doc format
  const wordHtml = getWordHtmlWrapper(title, rawHtml);
  const docPath = path.join(DOCS_DIR, `${baseName}.doc`);
  fs.writeFileSync(docPath, wordHtml, 'utf-8');
  console.log(`✓ Generated Word Document: ${docPath} (${fs.statSync(docPath).size} bytes)`);

  // 3. Generate HTML for PDF printing
  const pdfHtml = getPdfHtmlWrapper(title, rawHtml);
  const tempHtmlPath = path.join('/tmp', `${baseName}.html`);
  fs.writeFileSync(tempHtmlPath, pdfHtml, 'utf-8');

  // 4. Generate PDF via headless Chrome
  const pdfPath = path.join(DOCS_DIR, `${baseName}.pdf`);
  execSync(`google-chrome --headless --disable-gpu --no-sandbox --print-to-pdf="${pdfPath}" "${tempHtmlPath}" 2>&1`);
  console.log(`✓ Generated PDF Document: ${pdfPath} (${fs.statSync(pdfPath).size} bytes)`);

  // 5. Also copy to Artifact directory if available
  if (fs.existsSync(ARTIFACT_DIR)) {
    const artDocPath = path.join(ARTIFACT_DIR, `${baseName}.doc`);
    const artPdfPath = path.join(ARTIFACT_DIR, `${baseName}.pdf`);
    fs.copyFileSync(docPath, artDocPath);
    fs.copyFileSync(pdfPath, artPdfPath);
    console.log(`✓ Copied .doc and .pdf to Artifacts directory`);
  }
}

// Process both manual testing documents
processDocument('end-to-end-manual-test-guide', 'KnowledgePaat eBook Platform — Complete Manual Testing User Guide');
processDocument('manual-test-run-template', 'KnowledgePaat eBook Platform — Manual Test Run Execution Template');

console.log('\nAll printable Word (.doc) and PDF (.pdf) documents generated successfully!');
