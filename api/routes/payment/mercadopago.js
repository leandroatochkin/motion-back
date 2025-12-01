// mercadopago-subscription.js
// ES6 Module for MercadoPago Subscriptions v2.x
// npm install mercadopago
import dotenv from 'dotenv';
dotenv.config()
import { MercadoPagoConfig, PreApproval, Payment } from 'mercadopago';

// Initialize MercadoPago client
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  options: { 
    timeout: 5000,
  //  idempotencyKey: 'your-idempotency-key' // Optional
  }
});

const preApprovalClient = new PreApproval(client);
const paymentClient = new Payment(client);

/**
 * Create a subscription charge using MercadoPago
 * @param {Object} subscriptionData - Subscription details
 * @returns {Promise<Object>} Payment response
 */
export async function createSubscriptionCharge(subscriptionData) {
  try {
    const {
      email,
      amount,
      frequency = 1, // months
      planName,
      startDate = new Date(),
      endDate = null,
      backUrl =  `${process.env.FRONTEND_URL_A}/payment-success`
    } = subscriptionData;

    // Prepare start date (must be at least tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const subscriptionStartDate = startDate > tomorrow ? startDate : tomorrow;

    // Create a preapproval (subscription plan)
    const preapproval = await preApprovalClient.create({
      body: {
        reason: planName,
        auto_recurring: {
          frequency: frequency,
          frequency_type: 'months',
          transaction_amount: amount,
          currency_id: 'ARS'
        },
        back_url: backUrl,
        payer_email: email,
        status: 'pending'
      }
    });

    return {
      success: true,
      subscriptionId: preapproval.id,
      initPoint: preapproval.init_point,
      status: preapproval.status
    };

  } catch (error) {
    console.error('MercadoPago Error:', error);
    return {
      success: false,
      error: error.message,
      details: error.cause || error
    };
  }
}

/**
 * Alternative: Create a one-time payment (for manual recurring)
 * @param {Object} paymentData - Payment details
 * @returns {Promise<Object>} Payment response
 */
export async function createOneTimeCharge(paymentData) {
  try {
    const {
      email,
      amount,
      description,
      paymentMethodId,
      token,
      notificationUrl = backUrl =  `${process.env.FRONTEND_URL_A}/payment-success`
    } = paymentData;

    const payment = await paymentClient.create({
      body: {
        transaction_amount: amount,
        description: description,
        payment_method_id: paymentMethodId,
        token: token,
        installments: 1,
        payer: {
          email: email
        },
        notification_url: notificationUrl,
        metadata: {
          subscription_payment: true
        }
      }
    });

    return {
      success: true,
      paymentId: payment.id,
      status: payment.status,
      statusDetail: payment.status_detail
    };

  } catch (error) {
    console.error('Payment Error:', error);
    return {
      success: false,
      error: error.message,
      details: error.cause || error
    };
  }
}

/**
 * Get subscription status
 * @param {string} subscriptionId - The subscription ID
 * @returns {Promise<Object>} Subscription details
 */
export async function getSubscriptionStatus(subscriptionId) {
  try {
    const response = await preApprovalClient.get({ id: subscriptionId });
    
    return {
      success: true,
      status: response.status,
      data: response
    };
  } catch (error) {
    console.error('Get Subscription Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Cancel a subscription
 * @param {string} subscriptionId - The subscription ID to cancel
 * @returns {Promise<Object>} Cancellation response
 */
export async function cancelSubscription(subscriptionId) {
  try {
    const response = await preApprovalClient.update({
      id: subscriptionId,
      body: {
        status: 'cancelled'
      }
    });

    return {
      success: true,
      status: response.status
    };
  } catch (error) {
    console.error('Cancel Subscription Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle webhook notifications
 * @param {Object} webhookData - Data from MercadoPago webhook
 * @returns {Promise<Object>} Processed webhook data
 */
export async function handleWebhook(webhookData) {
  const { type, data } = webhookData;

  try {
    if (type === 'preapproval') {
      const subscriptionId = data.id;
      const subscriptionData = await getSubscriptionStatus(subscriptionId);
      
      return {
        success: true,
        type: 'subscription',
        subscriptionId,
        status: subscriptionData.status,
        data: subscriptionData.data
      };
    }

    if (type === 'payment') {
      const paymentId = data.id;
      const payment = await paymentClient.get({ id: paymentId });
      
      return {
        success: true,
        type: 'payment',
        paymentId,
        status: payment.status,
        data: payment
      };
    }

    return {
      success: false,
      error: 'Unknown webhook type'
    };

  } catch (error) {
    console.error('Webhook Handler Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}