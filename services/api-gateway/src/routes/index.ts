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