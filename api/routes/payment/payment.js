import express from 'express';
import { createDirectSubscription, handleWebhook } from './mercadopago.js';


const router = express.Router();

// POST /payment
router.post('/', async (req, res) => {
  console.log('📥 Body recibido:', req.body);

  const { email, plan } = req.body;

  const planName = plan; // 'premium' o 'pro'

  if (!email || !planName) {
    return res.status(400).json({ 
      error: 'Faltan campos requeridos: email, planName, captchaToken' 
    });
  }

  // Define los precios
  const prices = {
    premium: 5999,
    pro: 9999
  };

  if (!prices[planName]) {
    return res.status(400).json({ 
      error: 'Plan inválido. Use "premium" o "pro"' 
    });
  }

  console.log(`🔄 Creating subscription for ${email}...`);

  const result = await createDirectSubscription({
    email,
    amount: prices[planName],
    planName: `Plan ${planName.charAt(0).toUpperCase() + planName.slice(1)} - Motion Crush`,
    frequency: 1
  });

  if (result.success) {
    console.log('✅ Subscription created:', result.subscriptionId);
    res.json({
      success: true,
      subscriptionId: result.subscriptionId,
      checkoutUrl: result.initPoint,
      status: result.status,
      message: 'Redirige al usuario a checkoutUrl para completar el pago'
    });
  } else {
    console.error('❌ Subscription error:', result);
    res.status(400).json({ 
      success: false,
      error: result.error, 
      details: result.details 
    });
  }
});



export default router;