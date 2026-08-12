import mongoose from 'mongoose';

const AppSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  valueEncrypted: { type: String, required: true },
  maskedValue: { type: String, required: true }
}, { timestamps: true });

export const AppSetting = mongoose.models.AppSetting || mongoose.model('AppSetting', AppSettingSchema);
export default AppSetting;
