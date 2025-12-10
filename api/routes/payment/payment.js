import dotenv, { parse } from 'dotenv';
dotenv.config();
import express from 'express';
import { createDirectSubscription } from './mercadopago.js';
import { checkToken } from '../../middleware/checkToken.js';
import { supabase } from '../../storage/supabase.js';

const router = express.Router();

// POST /payment
router.post('/', checkToken, async (req, res) => {
  console.log('📥 Body recibido:', req.body);

  const { userId, email, plan } = req.body;

  if (!userId || !email || !plan) {
    return res.status(400).json({
      error: 'Faltan campos requeridos: userId, email, plan'
    });
  }

  const prices = {
    premium: parseInt(process.env.MP_PREMIUM_PRICE),
    pro: parseInt(process.env.MP_PRO_PRICE)
  };

  if (!prices[plan]) {
    return res.status(400).json({ error: 'Plan inválido' });
  }

  console.log(`🔄 Creating subscription for ${email}...`);

  const result = await createDirectSubscription({
    email,
    amount: prices[plan],
    planName: `Plan ${plan.charAt(0).toUpperCase() + plan.slice(1)} - Motion Crush`,
    frequency: 1
  });

  if (!result.success) {
    console.error('❌ Subscription error:', result);
    return res.status(400).json({
      success: false,
      error: result.error,
      details: result.details
    });
  }

  const { subscriptionId, nextBillingDate } = result;

  console.log('📌 Updating user subscription info on Supabase...');

  const { error: updateErr } = await supabase
    .from('users')
    .update({
      subscription_id: subscriptionId,
      plan: plan,
      status: result.status || 'pending',
      next_billing: nextBillingDate,
      valid_until: nextBillingDate // they keep access until that date
    })
    .eq('id', userId);

  if (updateErr) {
    console.error('❌ Error updating Supabase:', updateErr);
    return res.status(500).json({
      success: false,
      error: 'Error actualizando suscripción en Supabase'
    });
  }

  return res.json({
    success: true,
    subscriptionId,
    checkoutUrl: result.initPoint,
    nextBillingDate,
    message: 'Redirige al usuario a checkoutUrl para completar el pago'
  });
});


export default router;
