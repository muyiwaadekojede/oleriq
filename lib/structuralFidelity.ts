import { countRecoveredTables, recoveredDocumentSignals, type RecoveredDocument } from '@/lib/recoveredStructure';
import type { BatchDiagnosticReason, ExportFormat } from '@/lib/types';

function isMarkdownTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.includes('-') && /^[:|\-\s]+$/.test(trimmed);
}

function countMarkdownTables(markdown: string): number {
  const lines = markdown.replace(/\r/g, '').split('\n');
  let tableCount = 0;

  for (let index = 0; index < lines.length - 1; index += 1) {
    const current = lines[index]?.trim() || '';
    const next = lines[index + 1]?.trim() || '';

    if (!current.includes('|')) continue;
    if (!isMarkdownTableSeparator(next)) continue;
    tableCount += 1;
  }

  return tableCount;
}

function txtHasHeadingMarkers(outputContent: string): boolean {
  return /\[H[1-6]\]\s+\S/.test(outputContent);
}

function txtHasNestedListIndent(outputContent: string): boolean {
  return /^\s{2,}[-*]\s+\S/m.test(outputContent) || /^\s{2,}\d+\.\s+\S/m.test(outputContent);
}

function txtHasCodeFence(outputContent: string): boolean {
  return /```/.test(outputContent);
}

export function structuralDiagnosticReasonsForRecoveredDocumentExport(input: {
  sourceDocument: RecoveredDocument;
  format: ExportFormat;
  outputContent: string;
}): BatchDiagnosticReason[] {
  const signals = recoveredDocumentSignals(input.sourceDocument);
  const reasons: BatchDiagnosticReason[] = [];

  if (input.format === 'md') {
    if (signals.hasTable && countMarkdownTables(input.outputContent) < countRecoveredTables(input.sourceDocument)) {
      reasons.push('structure_table_loss_risk');
    }

    return reasons;
  }

  if (input.format === 'txt') {
    if (signals.hasDeepHeading && !txtHasHeadingMarkers(input.outputContent)) {
      reasons.push('structure_heading_loss_risk');
    }

    if (signals.hasTable) {
      reasons.push('structure_table_loss_risk');
    }

    if (signals.hasNestedList && !txtHasNestedListIndent(input.outputContent)) {
      reasons.push('structure_list_loss_risk');
    }

    if (signals.hasCodeBlock && !txtHasCodeFence(input.outputContent)) {
      reasons.push('structure_code_block_loss_risk');
    }

    return reasons;
  }

  return [];
}

export function structuralDiagnosticReasonsForDocumentExport(input: {
  sourceDocument: RecoveredDocument;
  format: ExportFormat;
  outputContent: string;
}): BatchDiagnosticReason[] {
  return structuralDiagnosticReasonsForRecoveredDocumentExport(input);
}
