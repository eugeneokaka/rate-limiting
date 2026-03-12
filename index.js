import express from "express";
import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// connect to Upstash Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// rate limiter middleware
async function rateLimiter(req, res, next) {
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    console.log(`Incoming request from IP: ${ip}`);

    const key = `rate_limit:${ip}`;

    // increment request count
    const count = await redis.incr(key);

    // if first request → set expiration
    if (count === 1) {
      await redis.expire(key, 30); // 30 seconds window
    }

    // block if limit exceeded
    if (count > 5) {
      return res.status(429).json({
        message: "Too many requests. Try again later.",
      });
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}

// protected route
app.get("/api/test", rateLimiter, (req, res) => {
  res.json({
    message: "Request successful",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
