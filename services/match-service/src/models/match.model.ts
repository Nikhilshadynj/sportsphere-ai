import mongoose, { Schema } from "mongoose";

const matchSchema = new Schema(
  {
    teamA: {
      type: String,
      required: true,
    },
    teamB: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      enum: ["T20", "ODI", "TEST"],
      required: true,
    },
    venue: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["upcoming", "live", "completed"],
      default: "upcoming",
    },
    score: {
      teamA: {
        runs: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
        overs: { type: Number, default: 0 },
      },
      teamB: {
        runs: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
        overs: { type: Number, default: 0 },
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Match", matchSchema);