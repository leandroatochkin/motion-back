import express from 'express';
import { createSubscriptionCharge, handleWebhook } from './mercadopago.js';

const router = express.Router();

// POST /payment
router.post('/', async (req, res) => {
  console.log('Body recibido:', req.body);

  const { email, amount, planName } = req.body;

  if (!email || !amount || !planName) {
    return res.status(400).json({ 
      error: 'Faltan campos: email, amount, planName' 
    });
  }

  const result = await createSubscriptionCharge({
    email,
    amount: parseFloat(amount),
    planName,
    frequency: 1
  });

  if (result.success) {
    res.json({
      subscriptionId: result.subscriptionId,
      checkoutUrl: result.initPoint
    });
  } else {
    res.status(400).json({ 
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