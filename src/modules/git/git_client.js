import fs from 'node:fs/promises';
import path from 'node:path';
import { ValidationError } from '../../common/types.js';
import config from '../../common/config.js';
import { assertAllowedTarget } from '../ai/code_fixer.js';

export function slugBranchName(value) {
  return String(value || 'fix/incident')
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-/]+|[-/]+$/g, '')
    .slice(0, 80) || 'fix/incident';
}

async function createSimpleGit(repoRoot) {
  const { simpleGit } = await import('simple-git');
  return simpleGit({ baseDir: repoRoot });
}

function assertProposal(proposal) {
  if (!proposal?.targetFilePath || !proposal?.proposedCodeSnippet) {
    throw new ValidationError('Git automation requires a code fix proposal with targetFilePath and proposedCodeSnippet.');
  }
}

export class GitClient {
  constructor({ repoRoot = process.cwd(), git = null, fetchImpl = globalThis.fetch, github = {} } = {}) {
    this.repoRoot = path.resolve(repoRoot);
    this.git = git;
    this.fetch = fetchImpl;
    this.github = {
      owner: github.owner || config.github.owner || '',
      repo: github.repo || config.github.repo || '',
      token: github.token || config.github.token || '',
      baseBranch: github.baseBranch || config.github.baseBranch || 'main',
      apiUrl: github.apiUrl || 'https://api.github.com'
    };
  }

  async getGit() {
    if (!this.git) this.git = await createSimpleGit(this.repoRoot);
    return this.git;
  }

  async currentBranch() {
    const git = await this.getGit();
    const branch = await git.branch();
    return branch.current;
  }

  async createFixBranch(branchName, { checkoutFrom = null } = {}) {
    const git = await this.getGit();
    const safeBranch = slugBranchName(branchName);
    if (checkoutFrom) await git.checkout(checkoutFrom);
    await git.checkoutLocalBranch(safeBranch);
    return safeBranch;
  }

  async applyProposal(proposal, { allowedPaths } = {}) {
    assertProposal(proposal);
    const targetFilePath = assertAllowedTarget(proposal.targetFilePath, allowedPaths);
    const absolutePath = path.resolve(this.repoRoot, targetFilePath);
    if (!absolutePath.startsWith(`${this.repoRoot}${path.sep}`) && absolutePath !== this.repoRoot) throw new ValidationError('Proposal target escapes repository root.');
    await fs.writeFile(absolutePath, proposal.proposedCodeSnippet, 'utf8');
    return targetFilePath;
  }

  async commitProposal(proposal, { branchName = proposal.gitBranchName, message = null, push = false, remote = 'origin' } = {}) {
    assertProposal(proposal);
    const git = await this.getGit();
    const safeBranch = await this.createFixBranch(branchName || `fix/${proposal.incidentId || 'incident'}`);
    const targetFilePath = await this.applyProposal(proposal);
    await git.add(targetFilePath);
    const commitMessage = message || `fix: automated remediation for incident ${proposal.incidentId || 'unknown'}`;
    const commitResult = await git.commit(commitMessage);
    if (push) await git.push(remote, safeBranch, ['--set-upstream']);
    return {
      branchName: safeBranch,
      commitSha: commitResult?.commit || commitResult?.summary?.hash || null,
      targetFilePath,
      commitMessage
    };
  }

  async createPullRequest({ branchName, title, body = '', baseBranch = this.github.baseBranch } = {}) {
    if (!this.github.owner || !this.github.repo || !this.github.token) {
      return { pullRequestUrl: null, skipped: true, reason: 'Missing GitHub owner, repo, or token configuration.' };
    }
    if (!this.fetch) throw new ValidationError('No fetch implementation available for GitHub PR creation.');

    const response = await this.fetch(`${this.github.apiUrl}/repos/${this.github.owner}/${this.github.repo}/pulls`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.github.token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, body, head: branchName, base: baseBranch })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`GitHub PR creation failed: ${data?.message || response.statusText}`);
    }
    return { pullRequestUrl: data.html_url, number: data.number, raw: data };
  }

  async automateFix(proposal, { push = false, openPR = false, commitMessage = null, prTitle = null, prBody = '' } = {}) {
    const commit = await this.commitProposal(proposal, { push, message: commitMessage });
    let pr = { pullRequestUrl: null, skipped: true };
    if (openPR) {
      pr = await this.createPullRequest({
        branchName: commit.branchName,
        title: prTitle || `Fix incident ${proposal.incidentId || ''}`.trim(),
        body: prBody || `Automated Fixly remediation for incident ${proposal.incidentId || 'unknown'}.`
      });
    }
    return { ...commit, pullRequestUrl: pr.pullRequestUrl, pr };
  }
}

export default GitClient;
