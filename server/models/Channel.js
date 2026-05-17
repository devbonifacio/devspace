import mongoose from 'mongoose'

const channelSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  group:    { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  type:     { type: String, enum: ['text', 'code-review', 'repos', 'announcements'], default: 'text' },
  private:  { type: Boolean, default: false },
  topic:    { type: String, default: '' }
}, { timestamps: true })

export default mongoose.model('Channel', channelSchema)