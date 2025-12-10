import express from 'express';
import { checkToken } from '../../middleware/checkToken.js';
import { supabase } from '../../storage/supabase.js';

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
    const { error } = await supabase
      .from('users')
      .update({
        user_status: 'inactive',
        deleted_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('❌ Error deleting user:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      message: "User account deleted"
    });

  } catch (err) {
    console.error('❌ Server error:', err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
