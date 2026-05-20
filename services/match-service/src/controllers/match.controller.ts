import { Request, Response } from "express";
import Match from "../models/match.model";

export const createMatch = async (req: Request, res: Response) => {
  try {
    const { teamA, teamB, format, venue } = req.body;

    if (!teamA || !teamB || !format) {
      return res.status(400).json({
        message: "teamA, teamB and format are required",
      });
    }

    const match = await Match.create({
      teamA,
      teamB,
      format,
      venue,
    });

    res.status(201).json(match);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Match creation failed",
    });
  }
};

export const getMatches = async (_req: Request, res: Response) => {
  try {
    const matches = await Match.find({}).sort({
      createdAt: -1,
    });

    res.json(matches);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Failed to fetch matches",
    });
  }
};

export const getMatchById = async (req: Request, res: Response) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        message: "Match not found",
      });
    }

    res.json(match);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Failed to fetch match",
    });
  }
};