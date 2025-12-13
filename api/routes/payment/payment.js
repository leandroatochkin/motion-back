import dotenv from 'dotenv';
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

  // Validate incoming data
  if (!userId || !email || !plan) {
    return res.status(400).json({
      success: false,
      error: 'Faltan campos requeridos: userId, email, plan'
    });
  }

  // Your plan prices
  const prices = {
    premium: parseInt(process.env.MP_PREMIUM_PRICE),
    pro: parseInt(process.env.MP_PRO_PRICE)
  };

  if (!prices[plan]) {
    return res.status(400).json({ 
      success: false,
      error: 'Plan inválido'
    });
  }

  console.log(`🔄 Creating subscription for user ${userId} (${email})`);

  // Create subscription in MP
  const result = await createDirectSubscription({
    userId,
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

  const { subscriptionId, status } = result;

  console.log('📌 Saving new subscription in Supabase...');

  // Store subscription info
  const { error: updateErr } = await supabase
    .from('users')
    .update({
      subscription_id: subscriptionId,
      status: status || 'pending',
      plan: 'pending',               // User gets full plan only after MP approves
      next_billing_date: null,       // MP will send via webhook after 1st payment
      valid_until: null
    })
    .eq('id', userId);

  if (updateErr) {
    console.error('❌ Error updating Supabase:', updateErr);
    return res.status(500).json({
      success: false,
      error: 'Error actualizando suscripción en Supabase'
    });
  }

  // Return redirect URL
  return res.json({
    success: true,
    subscriptionId,
    checkoutUrl: result.initPoint,
    subscriptionStatus: status,
    message: 'Redirige al usuario a checkoutUrl para completar el pago'
  });
});

export default router;

