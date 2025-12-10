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
    // 1. Check if the user exists
    const { data: user, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (selectError) throw selectError;

    const isReturningUser = !!user;

    // 2. If user does not exist, create it
    if (!user) {
      const { error: insertError } = await supabase
        .from('users')
        .insert({ 
          id: userId,
          user_status: 'active' // default
        });

      if (insertError) throw insertError;
    } 
    else {
      // If exists but is inactive, mark active again
      if (user.user_status === 'inactive') {
        await supabase
          .from('users')
          .update({ user_status: 'active' })
          .eq('id', userId);
      }
    }

    // 3. Fetch usage + plan
    const { data: details, error: usageError } = await supabase
      .from('users')
      .select('sketch_count, plan, subscription_id, user_status')
      .eq('id', userId)
      .maybeSingle();

    if (usageError) throw usageError;

    // 4. Limit logic
    const getLimit = (plan) => {
      switch (plan) {
        case 'premium':
          return PREMIUM_SKETCH_LIMIT;
        case 'pro':
          return MAX_SKETCH_LIMIT;
        default:
          return FREE_SKETCH_LIMIT;
      }
    };

    const limit = getLimit(details.plan);

    return res.json({
      ok: true,
      returningUser: isReturningUser,
      userStatus: details.user_status,
      usage: {
        used: details.sketch_count,
        limit,
        remaining: Math.max(0, limit - details.sketch_count),
      },
      plan: details.plan,
      subscriptionId: details.subscription_id
    });

  } catch (err) {
    console.error("CHECK LOGIN ERROR:", err);
    return res.status(500).json({ error: 'server error' });
  }
});

export default router;
