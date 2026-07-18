import { randomUUID } from "crypto";
import { Request, Response } from "express";
import mongoose from "mongoose";
import Match from "../models/match.model";

const allowedFormats = ["T20", "ODI", "TEST", "OTHER"];

export const createMatch = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      externalId,
      name,
      teamA,
      teamB,
      format,
      venue,
      startTime,
      status = "upcoming",
    } = req.body;

    if (!teamA || !teamB || !format || !startTime) {
      res.status(400).json({
        success: false,
        message: "teamA, teamB, format and startTime are required",
      });
      return;
    }

    if (!allowedFormats.includes(format)) {
      res.status(400).json({
        success: false,
        message: "format must be T20, ODI, TEST or OTHER",
      });
      return;
    }

    const parsedStartTime = new Date(startTime);

    if (Number.isNaN(parsedStartTime.getTime())) {
      res.status(400).json({
        success: false,
        message: "startTime must be a valid date",
      });
      return;
    }

    const match = await Match.create({
      externalId: externalId || `manual-${randomUUID()}`,
      name: name || `${teamA} vs ${teamB}`,
      teamA,
      teamB,
      format,
      venue: venue || "",
      startTime: parsedStartTime,
      status,
      lastSyncedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      data: match,
    });
  } catch (error) {
    console.error("Match creation failed:", error);

    if (
      error instanceof mongoose.Error.ValidationError
    ) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      res.status(409).json({
        success: false,
        message: "Match with this externalId already exists",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Match creation failed",
    });
  }
};

export const getMatches = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { status, format } = req.query;

    const filter: Record<string, unknown> = {};

    if (typeof status === "string") {
      filter.status = status;
    }

    if (typeof format === "string") {
      filter.format = format.toUpperCase();
    }

    const matches = await Match.find(filter)
      .sort({ startTime: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: matches.length,
      data: matches,
    });
  } catch (error) {
    console.error("Failed to fetch matches:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch matches",
    });
  }
};

export const getUpcomingMatches = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const requestedLimit = Number(req.query.limit || 20);
    const limit = Math.min(
      Math.max(requestedLimit, 1),
      100
    );

    const matches = await Match.find({
      status: "upcoming",
      startTime: {
        $gte: new Date(),
      },
    })
      .sort({ startTime: 1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      count: matches.length,
      data: matches,
    });
  } catch (error) {
    console.error("Failed to fetch upcoming matches:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch upcoming matches",
    });
  }
};

export const getMatchById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const match = mongoose.isValidObjectId(id)
      ? await Match.findById(id).lean()
      : await Match.findOne({
          externalId: id,
        }).lean();

    if (!match) {
      res.status(404).json({
        success: false,
        message: "Match not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: match,
    });
  } catch (error) {
    console.error("Failed to fetch match:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch match",
    });
  }
};