import express from 'express';
import { getSubscriptionStatus } from './mercadopago.js';
import { paymentClient } from './mercadopago.js';
import { supabase } from '../../storage/supabase.js';

const router = express.Router();


router.post('/', async (req, res) => {
  console.log('🔔 Webhook recibido:', req.body);
  
  const { type, data, action } = req.body;

  try {
    // Para suscripciones
    if (type === 'subscription_preapproval' || action === 'created') {
      const subscriptionId = data.id;
      const subscriptionData = await getSubscriptionStatus(subscriptionId);
      
      if (subscriptionData.success) {
        const { payer_email, status, auto_recurring, external_reference } = subscriptionData.data;
        
        // Extraer info del external_reference
        const [userId, planName] = external_reference?.split('_') || [];
        
        console.log('✅ Subscription webhook:', {
          subscriptionId,
          email: payer_email,
          status,
          userId,
          planName,
          amount: auto_recurring?.transaction_amount
        });

        // TODO: Actualizar base de datos
        if (status === 'authorized') {
            const { data: user, error: updateError } = await supabase
                .from('users')
                .update({
                plan: planName,          
                sketch_count: 0,
                subscription_id: subscriptionId       
                })
                .eq('id', userId)
                .select()
                .maybeSingle();

            if (updateError) {
                console.error('Error updating user plan:', updateError);
            } else {
                console.log(`User ${userId} plan updated to ${planName}`, user);
            }
        }
      }
    }

    // Para pagos individuales
    if (type === 'payment') {
      const paymentId = data.id;
      const payment = await paymentClient.get({ id: paymentId });
      
      console.log('💰 Payment webhook:', {
        paymentId,
        status: payment.status,
        amount: payment.transaction_amount
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.sendStatus(200); // Siempre retornar 200 para evitar reintentos
  }

});

export default router;