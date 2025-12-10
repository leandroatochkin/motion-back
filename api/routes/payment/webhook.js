import express from 'express';
import { getSubscriptionStatus } from './mercadopago.js';
import { paymentClient } from './mercadopago.js';
import { supabase } from '../../storage/supabase.js';

const router = express.Router();

router.post('/', async (req, res) => {
  console.log('🔔 Webhook recibido:', req.body);

  const { type, action, data } = req.body;

  try {
    /* -------------------------------------------------------------------------- */
    /*                 🔹 1. SUBSCRIPTION_PREAPPROVAL EVENTS                      */
    /* -------------------------------------------------------------------------- */
    if (type === 'subscription_preapproval') {
      const subscriptionId = data.id;

      const subscription = await getSubscriptionStatus(subscriptionId);
      if (!subscription.success) return res.sendStatus(200);

      const {
        status,                  // pending, authorized, paused, cancelled
        payer_email,
        auto_recurring,
        external_reference
      } = subscription.data;

      const nextBilling = auto_recurring?.next_payment_date || null;

      const [userId, planName] = external_reference?.split('_') || [];

      console.log('📡 Subscription Event:', {
        subscriptionId,
        status,
        action,
        userId,
        planName,
        nextBilling
      });

      /* ---------------------- CREATED (no payment yet) ----------------------- */
      if (action === 'created') {
        console.log("🟦 Subscription created — user has NOT paid yet.");

        await supabase.from('users')
          .update({
            subscription_id: subscriptionId,
            status: 'pending',
            next_billing: nextBilling,
            valid_until: nextBilling
          })
          .eq('id', userId);

        return res.sendStatus(200);
      }

      /* ------------------- PAUSED (payment failed or user) ------------------- */
      if (status === 'paused') {
        console.log('🟧 Subscription paused — switching user to free');

        await supabase.from('users')
          .update({
            status: 'paused',
            plan: 'free'
          })
          .eq('id', userId);

        return res.sendStatus(200);
      }

      /* ------------------- CANCELLED (user or MP) ---------------------------- */
      if (status === 'cancelled') {
        console.log('🟥 Subscription cancelled — switching user to free');

        await supabase.from('users')
          .update({
            status: 'cancelled',
            plan: 'free',
            subscription_id: null,
            next_billing: null,
            valid_until: null
          })
          .eq('id', userId);

        return res.sendStatus(200);
      }
    }

    /* -------------------------------------------------------------------------- */
    /*                              🔹 2. PAYMENT EVENTS                           */
    /* -------------------------------------------------------------------------- */
    if (type === 'payment') {

      const paymentId = data.id;
      const payment = await paymentClient.get({ id: paymentId });

      console.log('💰 Payment Event:', {
        paymentId,
        status: payment.status,
        amount: payment.transaction_amount,
        subscriptionId: payment.preapproval_id
      });

      /* ------------------- FIRST PAYMENT CONFIRMED ---------------------------- */
      if (payment.status === 'approved' && payment.preapproval_id) {
        const subscriptionId = payment.preapproval_id;

        const subscription = await getSubscriptionStatus(subscriptionId);
        if (!subscription.success) return res.sendStatus(200);

        const { external_reference, auto_recurring } = subscription.data;
        const nextBilling = auto_recurring?.next_payment_date || null;

        const [userId, planName] = external_reference.split('_');

        console.log(`🟩 First payment successful → activate plan ${planName}`);

        await supabase.from('users')
          .update({
            plan: planName,
            status: 'active',
            next_billing: nextBilling,
            valid_until: nextBilling,
            subscription_id: subscriptionId
          })
          .eq('id', userId);

        console.log(`✅ User ${userId} plan activated`);
      }
    }

    return res.sendStatus(200);

  } catch (err) {
    console.error('❌ Webhook Error:', err);
    return res.sendStatus(200);
  }
});

export default router;
