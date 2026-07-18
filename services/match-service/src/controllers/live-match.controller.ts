import { Request, Response } from "express";
import { getLiveMatches, syncCurrentMatches } from "../services/cricapi.service";

export const fetchLiveMatches = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const matches = await getLiveMatches();

    res.status(200).json({
      success: true,
      data: matches,
    });
  } catch (error) {
    console.error("Error fetching live matches:", error);

    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch live matches",
    });
  }
};

export const syncLiveMatches = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const matches = await syncCurrentMatches();

    res.status(200).json({
      success: true,
      message: "Current matches synced successfully",
      count: matches.length,
      data: matches,
    });
  } catch (error) {
    console.error("Error syncing live matches:", error);

    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to sync live matches",
    });
  }
};