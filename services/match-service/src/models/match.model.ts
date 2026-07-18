import mongoose, { InferSchemaType, Schema } from "mongoose";

const scoreSchema = new Schema(
  {
    runs: {
      type: Number,
      default: 0,
    },
    wickets: {
      type: Number,
      default: 0,
    },
    overs: {
      type: Number,
      default: 0,
    },
    inning: {
      type: String,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const matchSchema = new Schema(
  {
    externalId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    teamA: {
      type: String,
      required: true,
      trim: true,
    },

    teamB: {
      type: String,
      required: true,
      trim: true,
    },

    format: {
      type: String,
      enum: ["T20", "ODI", "TEST", "OTHER"],
      default: "OTHER",
    },

    venue: {
      type: String,
      default: "",
      trim: true,
    },

    startTime: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["upcoming", "live", "completed", "cancelled"],
      default: "upcoming",
      index: true,
    },

    providerStatus: {
      type: String,
      default: "",
    },

    score: {
      teamA: {
        type: scoreSchema,
        default: () => ({}),
      },

      teamB: {
        type: scoreSchema,
        default: () => ({}),
      },
    },

    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

matchSchema.index({
  status: 1,
  startTime: 1,
});

export type MatchData = InferSchemaType<typeof matchSchema>;

const Match =
  mongoose.models.Match || mongoose.model("Match", matchSchema);

export default Match;