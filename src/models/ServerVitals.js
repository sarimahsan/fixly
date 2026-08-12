import mongoose from 'mongoose';

const ServerVitalsSchema = new mongoose.Schema({
  serverId: { type: mongoose.Schema.Types.ObjectId, ref: 'MonitoredServer', required: true },
  cpuUsagePercent: { type: Number, required: true },
  memoryUsagePercent: { type: Number, required: true },
  diskUsagePercent: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

ServerVitalsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });

export const ServerVitals = mongoose.models.ServerVitals || mongoose.model('ServerVitals', ServerVitalsSchema);
export default ServerVitals;
