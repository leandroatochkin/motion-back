// api/routes/payment/payment.js
import express from 'express';
import { 
  createSubscriptionPlan, 
  createSubscriptionCharge,
  getPlanDetails,
  cancelSubscription,
  handleWebhook 
} from './mercadopago.js';

const router = express.Router();

// Store plan IDs (in production, use a database)
const PLAN_IDS = {
  premium: null,
  pro: null
};

// POST /payment/create-plans - Execute once to create plans
router.post('/create-plans', async (req, res) => {
  try {
    // Create Premium plan
    const premiumPlan = await createSubscriptionPlan({
      planName: 'Plan Premium - Motion Crush',
      amount: 5999,
      frequency: 1,
      billingDay: 1,
      repetitions: 12
    });

    if (!premiumPlan.success) {
      return res.status(500).json({ 
        error: 'Error creating premium plan', 
        details: premiumPlan.error 
      });
    }

    // Create Pro plan
    const proPlan = await createSubscriptionPlan({
      planName: 'Plan Pro - Motion Crush',
      amount: 9999,
      frequency: 1,
      billingDay: 1,
      repetitions: 12
    });

    if (!proPlan.success) {
      return res.status(500).json({ 
        error: 'Error creating pro plan', 
        details: proPlan.error 
      });
    }

    PLAN_IDS.premium = premiumPlan.planId;
    PLAN_IDS.pro = proPlan.planId;

    console.log('Plans created successfully:', PLAN_IDS);

    res.json({
      success: true,
      plans: {
        premium: {
          id: premiumPlan.planId,
          amount: 5999
        },
        pro: {
          id: proPlan.planId,
          amount: 9999
        }
      },
      message: 'Save these IDs in your database!'
    });

  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      details: error 
    });
  }
});

// POST /payment - Subscribe user to a plan
router.post('/', async (req, res) => {
  console.log('Body recibido:', req.body);

  const { email, planName } = req.body;

  if (!email || !planName) {
    return res.status(400).json({ 
      error: 'Faltan campos requeridos: email, planName, captchaToken' 
    });
  }

  // Validate plan exists
  if (!['premium', 'pro'].includes(planName)) {
    return res.status(400).json({ 
      error: 'Plan inválido. Use "premium" o "pro"' 
    });
  }

  // Get plan ID (in production, get from database)
  const planId = PLAN_IDS[planName];
  
  if (!planId) {
    return res.status(400).json({ 
      error: 'Plan no encontrado. Ejecuta POST /payment/create-plans primero',
      hint: 'Debes crear los planes antes de suscribir usuarios'
    });
  }

  // TODO: Validate captcha here
  // const captchaValid = await validateCaptcha(captchaToken);
  // if (!captchaValid) return res.status(400).json({ error: 'Captcha inválido' });

  const result = await createSubscriptionCharge({
    email,
    planId
  });

  if (result.success) {
    res.json({
      success: true,
      subscriptionId: result.subscriptionId,
      checkoutUrl: result.initPoint,
      status: result.status
    });
  } else {
    res.status(400).json({ 
      success: false,
      error: result.error, 
      details: result.details 
    });
  }
});

// POST /payment/cancel/:subscriptionId - Cancel subscription
router.post('/cancel/:subscriptionId', async (req, res) => {
  const { subscriptionId } = req.params;

  const result = await cancelSubscription(subscriptionId);
  
  if (result.success) {
    res.json({ 
      success: true,
      message: 'Subscription cancelled',
      status: result.status 
    });
  } else {
    res.status(400).json({ 
      success: false,
      error: result.error 
    });
  }
});

// POST /payment/webhook/mercadopago - Handle MercadoPago notifications
router.post('/webhook/mercadopago', async (req, res) => {
  console.log('Webhook recibido:', req.body);
  
  const result = await handleWebhook(req.body);
  
  if (result.success) {
    // Update your database here based on result.type and result.status
    console.log('Webhook procesado:', result);
    
    // Example: Update user subscription status in database
    // if (result.type === 'subscription' && result.status === 'authorized') {
    //   await updateUserSubscription(result.subscriptionId, 'active');
    // }
  }
  
  res.sendStatus(200); // Always return 200 to MercadoPago
});

export default router;