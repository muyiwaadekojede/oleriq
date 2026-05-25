import JSZip from 'jszip';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const structureUrl = `${baseUrl}/test-fixtures/structure-source.html`;

const settings = {
  fontFace: 'serif',
  fontSize: 16,
  lineSpacing: 1.6,
  colorTheme: 'light',
};

async function extractPdfText(bytes) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(bytes), disableWorker: true });
  const doc = await loadingTask.promise;
  try {
    const chunks = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      try {
        const text = await page.getTextContent();
        chunks.push(text.items.map((item) => item.str || '').join(' '));
      } finally {
        page.cleanup();
      }
    }
    return chunks.join('\n');
  } finally {
    await loadingTask.destroy();
  }
}

async function exportFormat(format) {
  const response = await fetch(`${baseUrl}/api/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      format,
      sourceUrl: structureUrl,
      images: 'on',
      settings,
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`Structure export ${format} failed: ${response.status} ${raw}`);
  }

  return {
    contentType: response.headers.get('content-type') || '',
    bytes: Buffer.from(await response.arrayBuffer()),
  };
}

const extractResponse = await fetch(`${baseUrl}/api/extract`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: structureUrl, images: 'on' }),
});

const extractJson = await extractResponse.json();

if (!extractResponse.ok || !extractJson.success) {
  throw new Error(`Structure extract failed: ${extractResponse.status} ${JSON.stringify(extractJson)}`);
}

if (!extractJson.exportDiagnosticReasonsByFormat) {
  throw new Error(`Expected exportDiagnosticReasonsByFormat on structure extract: ${JSON.stringify(extractJson)}`);
}

if ((extractJson.exportDiagnosticReasonsByFormat.md || []).length !== 0) {
  throw new Error(`Expected no Markdown structure-loss reasons after recovery, got: ${JSON.stringify(extractJson.exportDiagnosticReasonsByFormat.md)}`);
}

const txtReasons = extractJson.exportDiagnosticReasonsByFormat.txt || [];
if (!txtReasons.includes('structure_table_loss_risk')) {
  throw new Error(`Expected TXT structure warnings to keep table-loss risk, got: ${JSON.stringify(txtReasons)}`);
}

for (const reason of ['structure_heading_loss_risk', 'structure_list_loss_risk', 'structure_code_block_loss_risk']) {
  if (txtReasons.includes(reason)) {
    throw new Error(`Expected TXT structure recovery to clear ${reason}, got: ${JSON.stringify(txtReasons)}`);
  }
}

for (const format of ['docx', 'pdf']) {
  const reasons = extractJson.exportDiagnosticReasonsByFormat[format] || [];
  if (reasons.length !== 0) {
    throw new Error(`Expected ${format.toUpperCase()} structure reasons to be empty for the structure fixture, got: ${JSON.stringify(reasons)}`);
  }
}

const markdownExport = await exportFormat('md');
const markdown = markdownExport.bytes.toString('utf8');
for (const snippet of [
  '#### Nested subsection that should stay a heading',
  '##### Implementation detail note',
  '| Format | Readable headings | Tables preserved |',
  '  - Child point A',
  '```',
]) {
  if (!markdown.includes(snippet)) {
    throw new Error(`Recovered Markdown is missing ${JSON.stringify(snippet)}:\n${markdown}`);
  }
}

const txtExport = await exportFormat('txt');
const txt = txtExport.bytes.toString('utf8');
for (const snippet of [
  '[H4] Nested subsection that should stay a heading',
  '[H5] Implementation detail note',
  '  - Child point A',
  '[Table]',
  '```',
]) {
  if (!txt.includes(snippet)) {
    throw new Error(`Recovered TXT is missing ${JSON.stringify(snippet)}:\n${txt}`);
  }
}

const docxExport = await exportFormat('docx');
if (!docxExport.contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
  throw new Error(`Unexpected DOCX content type: ${docxExport.contentType}`);
}
const zip = await JSZip.loadAsync(docxExport.bytes);
const documentXml = await zip.file('word/document.xml').async('string');
for (const snippet of ['Nested subsection that should stay a heading', 'Implementation detail note']) {
  if (!documentXml.includes(snippet)) {
    throw new Error(`DOCX XML is missing ${JSON.stringify(snippet)}`);
  }
}
for (const snippet of ['Heading4', 'Heading5', '<w:tbl>', 'w:ilvl w:val="1"']) {
  if (!documentXml.includes(snippet)) {
    throw new Error(`DOCX XML is missing ${JSON.stringify(snippet)}`);
  }
}

const pdfExport = await exportFormat('pdf');
if (!pdfExport.contentType.includes('application/pdf')) {
  throw new Error(`Unexpected PDF content type: ${pdfExport.contentType}`);
}
if (pdfExport.bytes.length < 2000) {
  throw new Error(`Recovered PDF is unexpectedly small: ${pdfExport.bytes.length}`);
}
const pdfText = await extractPdfText(pdfExport.bytes);
for (const snippet of [
  'Nested subsection that should stay a heading',
  'Implementation detail note',
  'function keepStructure',
  'Child point A',
]) {
  if (!pdfText.includes(snippet)) {
    throw new Error(`Recovered PDF text is missing ${JSON.stringify(snippet)}:\n${pdfText}`);
  }
}

console.log('e2e-structure-recovery passed');
