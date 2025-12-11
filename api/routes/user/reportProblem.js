import express from "express";
import { checkToken } from "../../middleware/checkToken.js";
import { supabase } from "../../storage/supabase.js";
import { sanitizeInput } from "../../middleware/sanitizer.js";
import { suggestionRateLimit } from "../../middleware/rateLimiter.js";
import { checkBan, banIp } from "../../middleware/banIp.js";
import { isSpamSuggestion } from "../../middleware/spamDetector.js";

const router = express.Router();

router.post("/", checkToken, suggestionRateLimit, checkBan, async (req, res) => {
  const { type, content } = req.body;

  if (!type || !content) {
    return res.status(400).json({
      success: false,
      error: "type y content son requeridos."
    });
  }

  const userId = req.user.id;
  const userEmail = req.user.email;
  const ip = req.ip;

  const safeContent = sanitizeInput(content);
  const safeType = sanitizeInput(type);

if (isSpamSuggestion(safeContent)) {
    banIp(req.ip)
    return res.status(400).json({ message: "Your suggestion looks like spam." });
  }


  const { data, error } = await supabase
    .from("suggestions")
    .insert({
      userId,
      userEmail,
      type: safeType,
      content: safeContent,
      ip
    })
    .select()
    .single();

  if (error) {
    console.error("❌ Error inserting suggestion:", error);
    return res.status(500).json({ success: false, error: "DB error." });
  }

  return res.json({
    success: true,
    message: "Reporte recibido. Gracias!",
    suggestion: data
  });
});

export default router;
