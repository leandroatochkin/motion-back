import express from 'express';
import { checkToken } from '../../middleware/checkToken.js';
import { supabase } from '../../storage/supabase.js';
import { cancelSubscription } from '../payment/mercadopago.js';
import { isSpamSuggestion } from '../../middleware/spamDetector.js';
import { sanitizeInput } from '../../middleware/sanitizer.js';


const router = express.Router();

// POST /delete-account
router.post('/', checkToken, async (req, res) => {
  const { userId, exitReason } = req.body;

  // Basic validation
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: "Missing userId"
    });
  }

  if (!type || !content) {
    return res.status(400).json({
      success: false,
      error: "Exit suggestion requires type and content"
    });
  }

  try {
    // 1️⃣ Fetch subscription id
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("subscription_id, email")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      console.error("❌ Error fetching user:", userError);
      return res.status(500).json({ success: false, error: userError.message });
    }

    // 2️⃣ Cancel subscription if present
    if (user?.subscription_id) {
      await cancelSubscription(user.subscription_id, userId);
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

    const safeContent = sanitizeInput(exitReason);

    if (isSpamSuggestion(safeContent)) {
        safeContent = null
      }

    // 4️⃣ Insert exit suggestion
    const { error: suggestionError } = await supabase
      .from("suggestions")
      .insert({
        userId,
        userEmail: user.email,
        type: 'exit.suggestion',
        content: safeContent,
        resolved: false,
        notes: null
      });

    if (suggestionError) {
      console.error("❌ Error creating exit suggestion:", suggestionError);
      // Continue — don't break account deletion
    }

    return res.json({
      success: true,
      message: "User account deleted, subscription canceled, exit feedback saved."
    });

  } catch (err) {
    console.error('❌ Server error:', err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
