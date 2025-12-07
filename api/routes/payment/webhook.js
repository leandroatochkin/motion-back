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
    /*                     🔹 EVENTS: subscription_preapproval                     */
    /* -------------------------------------------------------------------------- */

    if (type === 'subscription_preapproval') {
      const subscriptionId = data.id;

      // Fetch MercadoPago subscription details
      const subscription = await getSubscriptionStatus(subscriptionId);

      if (!subscription.success) {
        console.log('❌ Error fetching subscription status');
        return res.sendStatus(200);
      }

      const {
        status,                  // authorized, pending, paused, cancelled
        payer_email,
        auto_recurring,
        external_reference
      } = subscription.data;

      const [userId, planName] = external_reference?.split('_') || [];

      console.log('📡 Subscription Event:', {
        subscriptionId,
        status,
        action,
        userId,
        planName,
      });

      /* -------------------------------------------------------------------------- */
      /*                            🔹 1. SUB CREATED                               */
      /* -------------------------------------------------------------------------- */
      if (action === 'created') {
        console.log('🟦 Subscription created but not authorized yet.');
      }

      /* -------------------------------------------------------------------------- */
      /*                     🔹 2. SUB AUTHORIZED (first payment OK)                */
      /* -------------------------------------------------------------------------- */
      if (status === 'authorized') {
        console.log('🟩 Subscription authorized — updating user plan');

        const { error } = await supabase
          .from('users')
          .update({
            plan: planName,
            sketch_count: 0,
            subscription_id: subscriptionId
          })
          .eq('id', userId);

        if (error) console.error('❌ Error updating plan:', error);
        else console.log(`✅ User ${userId} upgraded to plan ${planName}`);
      }

      /* -------------------------------------------------------------------------- */
      /*                     🔹 3. SUB PAUSED BY MP OR USER                        */
      /* -------------------------------------------------------------------------- */
      if (status === 'paused') {
        console.log('🟧 Subscription paused — setting plan to free');

        const { error } = await supabase
          .from('users')
          .update({
            plan: 'free'
          })
          .eq('id', userId);

        if (error) console.error('❌ Error pausing plan:', error);
        else console.log(`⏸️ User ${userId} plan set to free (paused)`);
      }

      /* -------------------------------------------------------------------------- */
      /*                     🔹 4. SUB CANCELLED (user or MP)                       */
      /* -------------------------------------------------------------------------- */
      if (status === 'cancelled') {
        console.log('🟥 Subscription cancelled — downgrading user');

        const { error } = await supabase
          .from('users')
          .update({
            plan: 'free',
            subscription_id: null
          })
          .eq('id', userId);

        if (error) console.error('❌ Error cancelling plan:', error);
        else console.log(`🧹 User ${userId} downgraded to free`);
      }
    }

    /* -------------------------------------------------------------------------- */
    /*                              🔹 PAYMENT EVENTS                               */
    /* -------------------------------------------------------------------------- */

    if (type === 'payment') {
      const paymentId = data.id;
      const payment = await paymentClient.get({ id: paymentId });

      console.log('💰 Payment Event:', {
        paymentId,
        status: payment.status,
        amount: payment.transaction_amount,
        subscriptionId: payment?.preapproval_id,
      });

      // Renewals will hit here — optional handling
      if (payment.status === 'approved' && payment.preapproval_id) {
        console.log(`🔄 Renewal payment for subscription ${payment.preapproval_id}`);

        // No need to update Supabase plan — subscription keeps user on the same plan
      }
    }

    /* -------------------------------------------------------------------------- */

    return res.sendStatus(200);

  } catch (err) {
    console.error('❌ Webhook Error:', err);
    return res.sendStatus(200);
  }
});

export default router;
