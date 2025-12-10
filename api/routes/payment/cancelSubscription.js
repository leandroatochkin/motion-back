import express from "express";
import { cancelSubscription } from "./mercadopago.js";
import { checkToken } from "../../middleware/checkToken.js";

const router = express.Router();

router.post("/", checkToken, async (req, res) => {
  const { subscriptionId, userId } = req.body;

  if (!subscriptionId || !userId) {
    return res.status(400).json({
      success: false,
      error: "subscriptionId y userId son requeridos."
    });
  }

  const result = await cancelSubscription(subscriptionId, userId);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.error
    });
  }

  return res.json({
    success: true,
    subscriptionId,
    status: result.status,
    message: "Suscripción cancelada. Plan cambiado a FREE."
  });
});

export default router;
