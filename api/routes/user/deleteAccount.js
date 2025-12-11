import express from 'express';
import { checkToken } from '../../middleware/checkToken.js';
import { supabase } from '../../storage/supabase.js';
import { cancelSubscription } from '../payments/mercadopago.js';

const router = express.Router();

// POST /delete-account
router.post('/', checkToken, async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: "Missing userId"
    });
  }

  try {
    // 1️⃣ Fetch subscription id
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("subscription_id")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      console.error("❌ Error fetching user:", userError);
      return res.status(500).json({ success: false, error: userError.message });
    }

    // 2️⃣ Cancel subscription if present
    if (user?.subscription_id) {
      const cancel = await cancelSubscription(user.subscription_id, userId);
      console.log("🔔 Subscription cancel result:", cancel);
    }

    // 3️⃣ Soft delete user
    const { error: updateError } = await supabase
      .from('users')
      .update({
        user_status: 'inactive',
        deleted_at: new Date().toISOString(),
        plan: 'free',
        subscription_id: null
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Error updating user:', updateError);
      return res.status(500).json({ success: false, error: updateError.message });
    }

    return res.json({
      success: true,
      message: "User account deleted and subscription canceled."
    });

  } catch (err) {
    console.error('❌ Server error:', err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
