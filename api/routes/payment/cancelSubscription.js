import express from "express";
import { cancelSubscription } from "./mercadopago.js";
import { checkToken } from "../../middleware/checkToken.js";
import { supabase } from "../../storage/supabase.js";

const router = express.Router();

router.post("/", checkToken, async (req, res) => {
  const { subscriptionId, userId, exitReason } = req.body;

  if (!subscriptionId || !userId) {
    return res.status(400).json({
      success: false,
      error: "subscriptionId y userId son requeridos."
    });
  }

  // Cancel subscription
  const result = await cancelSubscription(subscriptionId, userId);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.error
    });
  }

  // Store exit suggestion (OPTIONAL)
  if (exitReason && exitReason.trim() !== "") {
    const { data, error } = await supabase
      .from("suggestions")
      .insert({
        userId,
        content: exitReason,
        type: "exit",
        userEmail: req.user?.email || null
      });

    if (error) {
      console.error("❌ Error saving exit suggestion:", error);
    } else {
      console.log("📨 Exit reason saved:", data);
    }
  }

  return res.json({
    success: true,
    subscriptionId,
    status: result.status,
    message: "Suscripción cancelada. Plan cambiado a FREE."
  });
});

export default router;

