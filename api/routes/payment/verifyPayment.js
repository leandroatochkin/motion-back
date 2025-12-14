// verifyPayment.js (o payment.js si es el mismo archivo)
import express from 'express';
import { supabase } from '../../storage/supabase.js';
import { checkToken } from '../../middleware/checkToken.js';
import { getSubscriptionStatus } from './mercadopago.js';

const router = express.Router();

router.post('/', checkToken, async (req, res) => {
  const { userId, preapprovalId } = req.body;

  console.log('🔍 Verify payment request:', { userId, preapprovalId });

  if (!userId || !preapprovalId) {
    return res.status(400).json({ 
      error: 'userId and preapprovalId are required' 
    });
  }

  try {
    // 1. Consultar el estado de la suscripción en MercadoPago
    const subscriptionData = await getSubscriptionStatus(preapprovalId);

    if (!subscriptionData.success) {
      return res.status(404).json({ 
        error: 'Subscription not found in MercadoPago',
        details: subscriptionData.error 
      });
    }

    const { status, external_reference, payer_email } = subscriptionData.data;

    console.log('📋 MercadoPago subscription data:', {
      status,
      email: payer_email,
      external_reference
    });

    // 2. Extraer userId y planName del external_reference
    const [refUserId, planName] = external_reference?.split('_') || [];

    // 3. Verificar que el userId coincida
    if (refUserId !== userId) {
      return res.status(400).json({ 
        error: 'User ID does not match subscription',
        expected: refUserId,
        received: userId
      });
    }

    // 4. Si está autorizado, actualizar la base de datos
    if (status === 'authorized') {
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          plan: planName,
          subscription_id: preapprovalId,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Error updating user:', updateError);
        return res.status(500).json({ 
          error: 'Error updating user plan',
          details: updateError.message 
        });
      }

      console.log(`✅ User ${userId} updated to plan ${planName}`);

      return res.json({
        success: true,
        status: 'authorized',
        plan: planName,
        subscriptionId: preapprovalId,
        message: 'Subscription activated successfully'
      });
    } 
    else if (status === 'pending') {
      return res.json({
        success: true,
        status: 'pending',
        plan: planName,
        message: 'Payment is being processed'
      });
    } 
    else {
      return res.json({
        success: false,
        status: status,
        message: 'Payment not authorized'
      });
    }

  } catch (error) {
    console.error('❌ Error verifying payment:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

export default router;