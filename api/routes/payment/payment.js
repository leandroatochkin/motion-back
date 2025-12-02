import express from 'express';
import { createSubscriptionCharge, handleWebhook } from './mercadopago.js';
import { PLAN_IDS } from './mercadopago.js';
import { verifyCaptcha } from '../auth/validateCaptcha.js';
import { checkToken } from '../../middleware/checkToken.js';

const router = express.Router();

// POST /payment
router.post('/', async (req, res) => {
  console.log('Body recibido:', req.body);

  const { email, plan } = req.body;

  if (!email || !plan) {
    return res.status(400).json({ 
      error: 'Faltan campos requeridos' 
    });
  }

  const planName = plan

  const planId = PLAN_IDS[planName];
  
  // const captchaValid = await verifyCaptcha(captchaToken);
  // if (!captchaValid) {
  //   return res.status(400).json({ error: 'Captcha inválido' });
  // }
 

   if (!planId) {
    return res.status(400).json({ 
      error: '❌ Los planes no han sido creados todavía',
      hint: 'Ejecuta primero: POST /payment/create-plans',
      currentPlans: PLAN_IDS
    });
  }

  const result = await createSubscriptionCharge({
    email,
    //amount: parseFloat(amount),
    planId
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

// POST /payment/webhook/mercadopago
router.post('/webhook/mercadopago', async (req, res) => {
  console.log('Webhook recibido:', req.body);
  
  const result = await handleWebhook(req.body);
  console.log('Webhook procesado:', result);
  
  res.sendStatus(200);
});

export default router;