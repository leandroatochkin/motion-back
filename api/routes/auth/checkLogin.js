import express from 'express';
import { supabase } from '../../storage/supabase.js';
import { checkToken } from '../../middleware/checkToken.js';

const router = express.Router();

const FREE_SKETCH_LIMIT = parseInt(process.env.FREE_SKETCH_LIMIT);
const PREMIUM_SKETCH_LIMIT = parseInt(process.env.PREMIUM_SKETCH_LIMIT);
const MAX_SKETCH_LIMIT = parseInt(process.env.MAX_SKETCH_LIMIT);

router.post('/', checkToken, async (req, res) => {
  const { userId } = req.body;

  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    // Step 1: Upsert user row
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (selectError) throw selectError;

    if (!existingUser) {
      const { error: insertError } = await supabase
        .from('users')
        .insert({ id: userId });

      if (insertError) throw insertError;
    }

    // Step 2: Get usage
    const { data, error: usageError } = await supabase
      .from('users')
      .select('sketch_count, plan')
      .eq('id', userId)
      .maybeSingle();

    if (usageError) throw usageError;

    //const limit = (data.plan === 'pro' || data.plan === 'premium') ? MAX_SKETCH_LIMIT : FREE_SKETCH_LIMIT;

    const limit = (plan) => {
      switch (plan) {
        case 'premium':
          return PREMIUM_SKETCH_LIMIT;
        case 'pro':
          return MAX_SKETCH_LIMIT;
        default:
          return FREE_SKETCH_LIMIT;
      }
  }
    const limitValue = limit(data.plan);

    return res.json({
      ok: true,
      usage: {
        used: data.sketch_count,
        limitValue,
        remaining: Math.max(0, limit - data.sketch_count)
      }
    });

  } catch (err) {
    console.error("CHECK LOGIN ERROR:", err);
    return res.status(500).json({ error: 'server error' });
  }
});

export default router;
