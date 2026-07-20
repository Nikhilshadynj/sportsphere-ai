import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL ??
  "http://localhost:5002";

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL ??
  "http://localhost:5001";

const MATCH_SERVICE_URL =
  process.env.MATCH_SERVICE_URL ??
  "http://localhost:5003";

router.use("/ai", authenticate);

router.use(
  "/ai",
  createProxyMiddleware({
    target: AI_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      "^/ai": "",
    },
  })
);

/**
 * Auth Service Proxy
 * future service: http://auth-service:5001
 */
router.use(
  "/auth",
  createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
  })
);

router.use(
  "/matches",
  createProxyMiddleware({
    target: MATCH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      "^/matches": "/matches",
    },
  })
);
  
export default router;