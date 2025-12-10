import express from "express";
import { supabase } from "../../storage/supabase.js";
import { preApprovalClient } from "./mercadopago.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type !== "preapproval") return res.sendStatus(200);

    const subscriptionId = data.id;

    // Get full subscription info from MP
    const sub = await preApprovalClient.get({ id: subscriptionId });

    const {
      status,
      next_payment_date,
      external_reference
    } = sub;

    const [userId] = external_reference.split("_");

    // Map MP status → your internal status
    let plan = "free";

    if (status === "authorized" || status === "active") plan = "premium";
    if (status === "pending") plan = "pending";
    if (status === "paused" || status === "cancelled") plan = "free";

    await supabase
      .from("users")
      .update({
        subscription_status: status,
        next_billing_date: next_payment_date ?? null,
        plan,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId);

    return res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    return res.sendStatus(500);
  }
});

export default router;
