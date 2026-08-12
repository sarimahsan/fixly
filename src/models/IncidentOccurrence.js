import mongoose from 'mongoose';

const IncidentOccurrenceSchema = new mongoose.Schema({
  incidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', required: true, index: true },
  serverId: { type: mongoose.Schema.Types.ObjectId, ref: 'MonitoredServer' },
  rawLogLine: { type: String, required: true },
  serverVitalsSnapshot: {
    cpuUsagePercent: Number,
    memoryUsagePercent: Number,
    diskUsagePercent: Number
  },
  timestamp: { type: Date, default: Date.now, index: true }
});

IncidentOccurrenceSchema.index({ incidentId: 1, timestamp: -1 });

export const IncidentOccurrence = mongoose.models.IncidentOccurrence || mongoose.model('IncidentOccurrence', IncidentOccurrenceSchema);
export default IncidentOccurrence;
