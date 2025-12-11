// middleware/rateLimit.js

const RATE_LIMIT = 5;          // max suggestions
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

const ipBucket = new Map();
const userBucket = new Map();

export function suggestionRateLimit(req, res, next) {
  const ip = req.ip;
  const userId = req.user?.id;

  const now = Date.now();

  function clean(bucket, key) {
    const list = bucket.get(key)?.filter(ts => now - ts < WINDOW_MS) || [];
    bucket.set(key, list);
    return list;
  }

  const ipList = clean(ipBucket, ip);
  if (ipList.length >= RATE_LIMIT) {
    return res.status(429).json({
      success: false,
      error: "Too many suggestions from this IP. Try again later."
    });
  }

  if (userId) {
    const userList = clean(userBucket, userId);
    if (userList.length >= RATE_LIMIT) {
      return res.status(429).json({
        success: false,
        error: "You've sent too many suggestions. Try again later."
      });
    }


    userList.push(now);
    userBucket.set(userId, userList);
  }

  ipList.push(now);
  ipBucket.set(ip, ipList);

  next();
}
