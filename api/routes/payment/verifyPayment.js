// payment.js
import express from 'express';
import { supabase } from '../../storage/supabase.js';
import { checkToken } from '../../middleware/checkToken.js';

const router = express.Router();


router.post('/', checkToken, async (req, res) => {
const { userId, subscriptionId, collectionStatus } = req.body;

if(!userId || !subscriptionId || !collectionStatus) {
    return res.status(400).json({ error: 'userId, subscriptionId and collectionStatus are required' });
}

  if (collectionStatus !== 'approved' || collectionStatus !== 'authorized') {
    return res.status(400).json({ error: 'Payment not approved or authorized' });
    }

  const { data: user, error } = await supabase
    .from('users')
    .select('plan, subscription_id')
    .eq('id', userId)
    .maybeSingle();

  if (error || !user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if(user.subscription_id !== subscriptionId) {
    return res.status(400).json({ error: 'Subscription ID does not match user record' });
  }

  res.json({
    plan: user.plan,
    status: 'updated_from_webhook'
  });
});

export default router;