import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  retrieveContext,
} from "../services/rag/retrieval.service";

import {
  askDocuments,
} from "../services/rag/rag.service";

interface QueryDocumentBody {
  query?: string;
  documentId?: string;
  limit?: number;
}

export async function queryDocuments(
  req: Request<
    Record<string, never>,
    unknown,
    QueryDocumentBody
  >,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId =
      req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });

      return;
    }

    const query =
      req.body.query?.trim();

    if (!query) {
      res.status(400).json({
        success: false,
        message:
          "Query is required",
      });

      return;
    }

    const requestedLimit =
      Number(req.body.limit ?? 5);

    const limit = Math.min(
      Math.max(
        Number.isInteger(
          requestedLimit
        )
          ? requestedLimit
          : 5,
        1
      ),
      10
    );

    const result =
      await askDocuments({
        query,
        userId,

        documentId:
          req.body.documentId,

        limit,
      });

    res.status(200).json({
      success: true,
      query,
      answer:
        result.answer,
      sources:
        result.sources,
    });
  } catch (error) {
    next(error);
  }
}