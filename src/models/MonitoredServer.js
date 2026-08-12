import mongoose from 'mongoose';
import { ServerStatus } from '../common/types.js';

const MonitoredServerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  host: { type: String, required: true },
  port: { type: Number, default: 22, required: true },
  sshUser: { type: String, required: true },
  sshKeyPath: { type: String, required: true },
  status: { type: String, enum: Object.values(ServerStatus), default: ServerStatus.DISCONNECTED },
  lastPingAt: { type: Date }
}, { timestamps: true });

export const MonitoredServer = mongoose.models.MonitoredServer || mongoose.model('MonitoredServer', MonitoredServerSchema);
export default MonitoredServer;
