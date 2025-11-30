import dotenv from 'dotenv';
dotenv.config()
import express from 'express';
import { supabase } from '../../storage/supabase.js';
import { checkToken } from '../../middleware/checkToken.js';

const router = express.Router();

const FREE_SKETCH_LIMIT = parseInt(process.env.FREE_SKETCH_LIMIT);
const MAX_SKETCH_LIMIT = parseInt(process.env.MAX_SKETCH_LIMIT);

router.post('/', checkToken, async (req, res) => {
  const userId = req.body.userId;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    // 1) fetch current count
    const { data: userRow, error } = await supabase
      .from('users')
      .select('sketch_count, plan')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!userRow) return res.status(404).json({ error: 'user not found' });

    const limit = userRow.plan === 'pro' ? MAX_SKETCH_LIMIT : FREE_SKETCH_LIMIT;
    if (userRow.sketch_count >= limit) {
      return res.status(403).json({ error: 'sketch limit reached' });
    }

    // 2) create sketch row (optional) and increment count
    // NOTE: Supabase JS doesn't support multi-statement transactions easily over REST,
    // but we can do optimistic update: increment with single update SQL to avoid race conditions.
    // Use Postgres RPC or SQL update with WHERE clause to ensure atomicity.

    // Atomic increment only if below limit:
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({ sketch_count: (userRow.sketch_count + 1) })
      .eq('id', userId)
      .filter('sketch_count', 'lt', limit) // ensures we only update if still below limit
      .select();

    if (updateError) throw updateError;
    if (updateData.length === 0) {
      // another concurrent update probably took the last slot
      return res.status(409).json({ error: 'concurrent limit reached' });
    }

    // optionally insert a sketch record
    const { data: sketch, error: sketchError } = await supabase
      .from('sketches')
      .insert({ user_id: userId, meta: req.body.meta || {} })
      .select()
      .single();

    if (sketchError) throw sketchError;

    return res.json({
        ok: true,
        sketchId: sketch.id,
        used: updateData[0].sketch_count,
        limit,
        remaining: Math.max(0, limit - updateData[0].sketch_count)
        });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

export default router;