import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { generateUnifiedDiff } from './diff_generator.js';
import { ValidationError, WSEventType } from '../../common/types.js';

const DEFAULT_ALLOWED_PATHS = ['src/', 'app/', 'lib/', 'routes/', 'server/', 'target_environment/'];

export function sanitizeRelativePath(filePath) {
  const normalized = path.posix.normalize(String(filePath || '').replace(/\\/g, '/'));
  if (!normalized || normalized.startsWith('../') || path.isAbsolute(normalized)) {
    throw new ValidationError(`Unsafe target file path: ${filePath}`);
  }
  return normalized;
}

export function assertAllowedTarget(filePath, allowedPaths = DEFAULT_ALLOWED_PATHS) {
  const safePath = sanitizeRelativePath(filePath);
  const allowed = allowedPaths.some((prefix) => safePath === prefix.replace(/\/$/, '') || safePath.startsWith(prefix));
  if (!allowed) {
    throw new ValidationError(`AI fix target outside allowed mapping: ${safePath}`);
  }
  return safePath;
}

export function extractTargetPathFromStack(stackTrace = '', allowedPaths = DEFAULT_ALLOWED_PATHS) {
  const matches = String(stackTrace).match(/[\w./-]+\.(?:js|mjs|cjs|ts|jsx|tsx)/g) || [];
  for (const candidate of matches) {
    const cleaned = candidate.replace(/^.*?(src\/|app\/|lib\/|routes\/|server\/|target_environment\/)/, '$1');
    try {
      return assertAllowedTarget(cleaned, allowedPaths);
    } catch {
      // keep scanning
    }
  }
  return null;
}

function replaceFirst(content, patterns, replacement) {
  for (const pattern of patterns) {
    if (pattern.test(content)) return content.replace(pattern, replacement);
  }
  return content;
}

export function proposeContentPatch({ originalContent, incident = {}, diagnosis = {} }) {
  const text = [incident.title, incident.errorType, incident.normalizedMessage, incident.rawStackTrace, diagnosis.rootCause].filter(Boolean).join('\n');

  if (/connect|timeout|database|pool/i.test(text)) {
    const patched = replaceFirst(
      originalContent,
      [/await\s+db\.connect\(\)/, /db\.connect\(\)/, /await\s+database\.connect\(\)/, /database\.connect\(\)/],
      'await connectWithTimeout(db, 5000)'
    );
    if (patched !== originalContent) return patched;
  }

  if (/cannot read|undefined|null|typeerror/i.test(text)) {
    const lines = originalContent.split('\n');
    const returnLineIndex = lines.findIndex((line) => /return\s+\w+\./.test(line));
    if (returnLineIndex >= 0) {
      const variable = lines[returnLineIndex].match(/return\s+(\w+)\./)?.[1];
      if (variable && !originalContent.includes(`if (!${variable})`)) {
        lines.splice(returnLineIndex, 0, `${lines[returnLineIndex].match(/^\s*/)?.[0] || ''}if (!${variable}) return null;`);
        return lines.join('\n');
      }
    }
  }

  const note = '// Fixly AI proposal: review this failure path and add defensive handling for the diagnosed incident.';
  return originalContent.includes(note) ? originalContent : `${note}\n${originalContent}`;
}

export async function proposeCodeFix(incident, diagnosis = {}, {
  repoRoot = process.cwd(),
  targetFilePath = null,
  allowedPaths = DEFAULT_ALLOWED_PATHS,
  broadcaster = null,
  persist = false
} = {}) {
  const inferredPath = targetFilePath || incident?.targetFilePath || extractTargetPathFromStack(incident?.rawStackTrace, allowedPaths);
  if (!inferredPath) throw new ValidationError('Unable to infer a safe target file for the code fix proposal.');
  const safePath = assertAllowedTarget(inferredPath, allowedPaths);
  const rootPath = path.resolve(repoRoot);
  const absolutePath = path.resolve(rootPath, safePath);
  if (!absolutePath.startsWith(`${rootPath}${path.sep}`) && absolutePath !== rootPath) throw new ValidationError('Resolved target path escapes repository root.');

  const originalContent = await fs.readFile(absolutePath, 'utf8');
  const proposedContent = proposeContentPatch({ originalContent, incident, diagnosis });
  const diffPatch = generateUnifiedDiff({ originalContent, proposedContent, filePath: safePath });
  const incidentId = String(incident?._id || incident?.id || incident?.fingerprint || 'unknown');
  const slug = String(incident?.errorType || incident?.title || 'incident').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'incident';
  const proposal = {
    proposalId: crypto.createHash('sha1').update(`${incidentId}:${safePath}:${diffPatch}`).digest('hex').slice(0, 16),
    incidentId,
    targetFilePath: safePath,
    originalCodeSnippet: originalContent,
    proposedCodeSnippet: proposedContent,
    diffPatch,
    gitBranchName: `fix/${incidentId.slice(0, 8)}-${slug}`,
    pullRequestUrl: null
  };

  if (persist && typeof incident.save === 'function') {
    incident.fixProposal = proposal;
    await incident.save();
  }

  broadcaster?.broadcast?.(WSEventType.FIX_PROPOSED, {
    incidentId: proposal.incidentId,
    proposalId: proposal.proposalId,
    targetFilePath: proposal.targetFilePath,
    gitBranchName: proposal.gitBranchName,
    pullRequestUrl: proposal.pullRequestUrl,
    diffPatch: proposal.diffPatch
  });

  return proposal;
}

export default {
  assertAllowedTarget,
  extractTargetPathFromStack,
  proposeContentPatch,
  proposeCodeFix,
  sanitizeRelativePath
};
