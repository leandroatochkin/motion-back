// payment.js
import express from 'express';
import { supabase } from '../../storage/supabase.js';

const router = express.Router();


router.get('/', async (req, res) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('plan')
    .eq('id', req.query.userId)
    .maybeSingle();

  if (error || !user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    plan: user.plan,
    status: 'updated_from_webhook'
  });
});

export default router;