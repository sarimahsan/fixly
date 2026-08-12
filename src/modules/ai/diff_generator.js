import { ValidationError } from '../../common/types.js';

function normalizeLines(value) {
  if (typeof value !== 'string') {
    throw new ValidationError('Diff generator input must be a string.');
  }
  return value.split('\n');
}

function buildLcsMatrix(aLines, bLines) {
  const rows = aLines.length + 1;
  const cols = bLines.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = aLines.length - 1; i >= 0; i -= 1) {
    for (let j = bLines.length - 1; j >= 0; j -= 1) {
      matrix[i][j] = aLines[i] === bLines[j]
        ? matrix[i + 1][j + 1] + 1
        : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
    }
  }
  return matrix;
}

export function lineChanges(originalContent, proposedContent) {
  const aLines = normalizeLines(originalContent);
  const bLines = normalizeLines(proposedContent);
  const matrix = buildLcsMatrix(aLines, bLines);
  const changes = [];
  let i = 0;
  let j = 0;

  while (i < aLines.length && j < bLines.length) {
    if (aLines[i] === bLines[j]) {
      changes.push({ type: 'context', line: aLines[i], oldLineNumber: i + 1, newLineNumber: j + 1 });
      i += 1;
      j += 1;
    } else if (matrix[i + 1][j] >= matrix[i][j + 1]) {
      changes.push({ type: 'remove', line: aLines[i], oldLineNumber: i + 1, newLineNumber: null });
      i += 1;
    } else {
      changes.push({ type: 'add', line: bLines[j], oldLineNumber: null, newLineNumber: j + 1 });
      j += 1;
    }
  }

  while (i < aLines.length) {
    changes.push({ type: 'remove', line: aLines[i], oldLineNumber: i + 1, newLineNumber: null });
    i += 1;
  }
  while (j < bLines.length) {
    changes.push({ type: 'add', line: bLines[j], oldLineNumber: null, newLineNumber: j + 1 });
    j += 1;
  }
  return changes;
}

function makeRange(start, count) {
  return count === 1 ? `${start}` : `${start},${count}`;
}

export function generateUnifiedDiff({ originalContent, proposedContent, filePath = 'unknown' }) {
  const changes = lineChanges(originalContent, proposedContent);
  const oldCount = changes.filter((change) => change.type !== 'add').length;
  const newCount = changes.filter((change) => change.type !== 'remove').length;
  const oldStart = changes.find((change) => change.oldLineNumber)?.oldLineNumber || 1;
  const newStart = changes.find((change) => change.newLineNumber)?.newLineNumber || 1;

  const body = changes.map((change) => {
    if (change.type === 'add') return `+${change.line}`;
    if (change.type === 'remove') return `-${change.line}`;
    return ` ${change.line}`;
  });

  return [
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
    `@@ -${makeRange(oldStart, oldCount)} +${makeRange(newStart, newCount)} @@`,
    ...body
  ].join('\n');
}

export function summarizeDiff(diffPatch) {
  const lines = String(diffPatch || '').split('\n');
  return lines.reduce((summary, line) => {
    if (line.startsWith('+') && !line.startsWith('+++')) summary.additions += 1;
    if (line.startsWith('-') && !line.startsWith('---')) summary.deletions += 1;
    return summary;
  }, { additions: 0, deletions: 0 });
}

export default {
  lineChanges,
  generateUnifiedDiff,
  summarizeDiff
};
