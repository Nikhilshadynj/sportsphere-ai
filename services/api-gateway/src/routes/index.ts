import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();


router.use("/ai", authenticate);

router.use(
  "/ai",
  createProxyMiddleware({
    target: "http://localhost:5002",
    changeOrigin: true,
    pathRewrite: {
      "^/ai": "",
    },
  })
);

/**
 * ai-service-python proxy — NEW, side-by-side with Node's /ai route above.
 * Node's /ai is left completely untouched (same isolation approach used
 * for RabbitMQ in Step 1 — see AI_CONTEXT/DECISIONS.md "Namespace isolation").
 * Once ai-service-python has full feature parity and is verified stable,
 * this route can replace /ai entirely — not done yet, deliberately.
 */
router.use("/ai-py", authenticate);

router.use(
  "/ai-py",
  createProxyMiddleware({
    target: "http://localhost:8000",
    changeOrigin: true,
    pathRewrite: {
      "^/ai-py": "",
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
    target: "http://localhost:5001",
    changeOrigin: true,
  })
);

router.use(
  "/matches",
  createProxyMiddleware({
    target: "http://localhost:5003",
    changeOrigin: true,
    pathRewrite: {
      "^/matches": "/matches",
    },
  })
);

export default router;