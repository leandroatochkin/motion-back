import express from 'express';
import { cancelSubscription } from './mercadopago.js';

const router = express.Router();

// POST /payment  → Cancel subscription
router.post('/', async (req, res) => {
  const { subscriptionId, userId } = req.body;

  // Validate required fields
  if (!subscriptionId || !userId) {
    return res.status(400).json({
      success: false,
      error: 'Faltan campos requeridos: subscriptionId y userId'
    });
  }

  try {
    // Run MercadoPago + Supabase cancellation
    const result = await cancelSubscription(subscriptionId, userId);

    if (!result.success) {
      console.error('❌ Error al cancelar la suscripción:', result.error);
      return res.status(400).json({
        success: false,
        error: result.error || 'Error al cancelar suscripción'
      });
    }

    console.log(`✅ Suscripción ${subscriptionId} cancelada para usuario ${userId}`);

    return res.json({
      success: true,
      subscriptionId,
      userId,
      status: result.subscriptionStatus, // MP status: "cancelled"
      planUpdated: true,
      message: 'Suscripción cancelada y plan del usuario cambiado a free.'
    });

  } catch (err) {
    console.error('❌ Server error:', err);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

export default router;
