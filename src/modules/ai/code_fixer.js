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
    const returnLineIndex = lines.findIndex((line) => /return\s+\w+\./.test(line) || /req\.user\./.test(line));
    if (returnLineIndex >= 0) {
      lines[returnLineIndex] = lines[returnLineIndex].replace(/req\.user\.account_status/, "req.user?.account_status || 'UNKNOWN'");
      return lines.join('\n');
    }
  }

  const note = '// Fixly AI proposal: review this failure path and add defensive handling for the diagnosed incident.';
  return originalContent.includes(note) ? originalContent : `${note}\n${originalContent}`;
}

export async function generateAIFixWithGroq({ remoteFileContent = '', targetFilePath = 'src/routes/user_profile.js', incident = {}, diagnosis = {} }) {
  const safeOriginal = String(remoteFileContent || '');
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey.startsWith('ghp_')) {
    const fixedContent = proposeContentPatch({ originalContent: safeOriginal, incident, diagnosis });
    return generateUnifiedDiff({ originalContent: safeOriginal, proposedContent: String(fixedContent), filePath: targetFilePath });
  }

  try {
    const prompt = `Target File Path: ${targetFilePath}\nError Log: ${incident.rawLogLine || incident.title}\nAI Root Cause: ${diagnosis.rootCause || ''}\n\nLive Existing File Content of ${targetFilePath}:\n\`\`\`javascript\n${safeOriginal}\n\`\`\`\n\nCRITICAL INSTRUCTIONS:\n1. You MUST preserve the EXACT file structure, imports, routes, and functions.\n2. Fix ONLY the specific line of code causing the bug (e.g. line 88: const accountStatus = req.user?.account_status || 'UNKNOWN';).\n3. Do NOT rewrite or re-implement the rest of the file.\n4. Return ONLY a JSON object with key "fixedCode" containing the entire complete updated file content without markdown code blocks.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are Fixly AI Staff Engineer. Analyze full source code and return fixed file content in JSON format with key "fixedCode".' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (response.ok) {
      const data = await response.json();
      const resObj = JSON.parse(data.choices[0].message.content);
      if (resObj && resObj.fixedCode) {
        const fixedStr = typeof resObj.fixedCode === 'string' ? resObj.fixedCode : JSON.stringify(resObj.fixedCode, null, 2);
        return generateUnifiedDiff({ originalContent: safeOriginal, proposedContent: fixedStr, filePath: targetFilePath });
      }
    }
  } catch {
    // Fall back to rule diff
  }

  const fixedContent = proposeContentPatch({ originalContent: safeOriginal, incident, diagnosis });
  return generateUnifiedDiff({ originalContent: safeOriginal, proposedContent: String(fixedContent), filePath: targetFilePath });
}

export async function proposeCodeFix(incident, diagnosis = {}, options = {}) {
  const targetFilePath = options.targetFilePath || 'src/routes/user_profile.js';
  const remoteFileContent = options.remoteFileContent || '';
  const diffPatch = await generateAIFixWithGroq({ remoteFileContent, targetFilePath, incident, diagnosis });
  return {
    targetFilePath,
    diffPatch,
    confidence: diagnosis.confidenceScore || 0.85
  };
}

export default {
  assertAllowedTarget,
  extractTargetPathFromStack,
  proposeCodeFix,
  proposeContentPatch,
  generateAIFixWithGroq,
  sanitizeRelativePath
};
