const banList = new Map();

export function checkBan(req, res, next) {
  const ip = req.ip;
  const now = Date.now();

  if (banList.has(ip)) {
    const banUntil = banList.get(ip);
    if (now < banUntil) {
      return res.status(403).json({ message: "IP temporarily banned due to spam." });
    } else {
      banList.delete(ip);
    }
  }

  next();
}

export function banIp(ip, minutes = 10) {
  banList.set(ip, Date.now() + minutes * 60 * 1000);
}