import express from "express";
import { checkToken } from "../../middleware/checkToken.js";
import { supabase } from "../../storage/supabase.js";

const router = express.Router();

router.post("/", checkToken, async (req, res) => {
  const { type, content } = req.body;

  if (!type || !content) {
    return res.status(400).json({
      success: false,
      error: "type y content son requeridos."
    });
  }

  const userId = req.user.id;
  const userEmail = req.user.email;

  const { data, error } = await supabase
    .from("suggestions")
    .insert({
      userId,
      userEmail,
      type,
      content
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
