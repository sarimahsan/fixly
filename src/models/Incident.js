import mongoose from 'mongoose';
import { IncidentStatus, IncidentSeverity, ResolverType, CodeFixStatus } from '../common/types.js';

const AIDiagnosisSubSchema = new mongoose.Schema({
  severity: { type: String, enum: Object.values(IncidentSeverity), required: true },
  rootCause: { type: String, required: true },
  confidenceScore: { type: Number, required: true, min: 0, max: 1 },
  automatableFixExists: { type: Boolean, required: true, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const CodeFixProposalSubSchema = new mongoose.Schema({
  targetFilePath: { type: String, required: true },
  originalCodeSnippet: { type: String, required: true },
  proposedCodeSnippet: { type: String, required: true },
  diffPatch: { type: String, required: true },
  gitBranchName: { type: String, required: true },
  gitCommitSha: { type: String },
  pullRequestUrl: { type: String },
  status: { type: String, enum: Object.values(CodeFixStatus), default: CodeFixStatus.PENDING },
  createdAt: { type: Date, default: Date.now },
  appliedAt: { type: Date }
}, { _id: false });

const IncidentSchema = new mongoose.Schema({
  fingerprint: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  errorType: { type: String, required: true },
  normalizedMessage: { type: String, required: true },
  rawStackTrace: { type: String },
  status: { type: String, enum: Object.values(IncidentStatus), default: IncidentStatus.OPEN, index: true },
  severity: { type: String, enum: Object.values(IncidentSeverity), default: IncidentSeverity.MEDIUM },
  occurrenceCount: { type: Number, default: 1, required: true },
  firstSeenAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now, index: true },
  resolvedAt: { type: Date },
  resolvedByType: { type: String, enum: Object.values(ResolverType) },
  resolvedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolutionNotes: { type: String },
  diagnosis: { type: AIDiagnosisSubSchema },
  fixProposal: { type: CodeFixProposalSubSchema }
}, { timestamps: true });

IncidentSchema.index({ status: 1, lastSeenAt: -1 });

export const Incident = mongoose.models.Incident || mongoose.model('Incident', IncidentSchema);
export default Incident;
