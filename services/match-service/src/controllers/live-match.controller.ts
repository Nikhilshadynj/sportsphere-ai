import {
    Request,
    Response,
  } from "express";
  
  import {
    getLiveMatches,
  } from "../services/cricapi.service";
  
  export const fetchLiveMatches =
    async (
      req: Request,
      res: Response
    ) => {
      try {
        const data =
          await getLiveMatches();
  
        res.json(data);
      } catch (error) {
        console.log(error);
  
        res.status(500).json({
          message:
            "Failed to fetch live matches",
        });
      }
    };