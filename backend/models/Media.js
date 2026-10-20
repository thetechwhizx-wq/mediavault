const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true },
    type: { type: String, enum: ['movie', 'show', 'game'], required: true },
    status: {
      type: String,
      enum: ['plan_to_watch', 'in_progress', 'completed', 'rewatch', 'dropped'],
      default: 'completed',
    },
    progress: { type: String, default: '' },
    poster: { type: String, default: '' },
    watchedDate: { type: String, default: '' },
    venue: { type: String, default: '' },
    notes: { type: String, default: '' },
    hoursPlayed: { type: Number, default: 0 },
    targetHours: { type: Number, default: 0 },
    rating: { type: Number, default: null },
    review: { type: String, default: '' },
    importedFrom: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Media || mongoose.model('Media', MediaSchema);
