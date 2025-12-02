// mercadopago-subscription.js
// ES6 Module for MercadoPago Subscriptions v2.x
// npm install mercadopago
import dotenv from 'dotenv';
dotenv.config();

import { MercadoPagoConfig, PreApproval, Payment, PreApprovalPlan } from 'mercadopago';

// Initialize MercadoPago client
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  options: { 
    timeout: 5000
  }
});

const preApprovalClient = new PreApproval(client);
const preApprovalPlanClient = new PreApprovalPlan(client);
const paymentClient = new Payment(client);

/**
 * Create a subscription plan in MercadoPago (execute once per plan)
 * @param {Object} planData - Plan details
 * @returns {Promise<Object>} Plan response
 */
export async function createSubscriptionPlan(planData) {
  try {
    const {
      planName,
      amount,
      frequency = 1,
      repetitions = 12,
      billingDay = 1,
      billingDayProportional = true,
      backUrl = `${process.env.FRONTEND_URL_A}/payment-success`
    } = planData;

    const plan = await preApprovalPlanClient.create({
      body: {
        reason: planName,
        auto_recurring: {
          frequency: frequency,
          frequency_type: 'months',
          repetitions: repetitions,
          billing_day: billingDay,
          billing_day_proportional: billingDayProportional,
          transaction_amount: amount,
          currency_id: 'ARS'
        },
        back_url: backUrl
      }
    });

    return {
      success: true,
      planId: plan.id,
      data: plan
    };

  } catch (error) {
    console.error('MercadoPago Plan Error:', error);
    return {
      success: false,
      error: error.message,
      details: error.cause || error
    };
  }
}

/**
 * Subscribe a user to an existing plan
 * @param {Object} subscriptionData - Subscription details
 * @returns {Promise<Object>} Subscription response
 */
export async function createSubscriptionCharge(subscriptionData) {
  try {
    const {
      email,
      planId,
      backUrl = `${process.env.FRONTEND_URL_A}/payment-success`,
      cardTokenId = null
    } = subscriptionData;

    const subscriptionBody = {
      preapproval_plan_id: planId,
      payer_email: email,
      back_url: backUrl,
      status: 'pending'
    };

    if (cardTokenId) {
      subscriptionBody.card_token_id = cardTokenId;
    }

    const preapproval = await preApprovalClient.create({
      body: subscriptionBody
    });

    return {
      success: true,
      subscriptionId: preapproval.id,
      initPoint: preapproval.init_point,
      status: preapproval.status
    };

  } catch (error) {
    console.error('MercadoPago Subscription Error:', error);
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
      notificationUrl = `${process.env.FRONTEND_URL_A}/webhook/mercadopago`
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
 * Get plan details
 * @param {string} planId - The plan ID
 * @returns {Promise<Object>} Plan details
 */
export async function getPlanDetails(planId) {
  try {
    const response = await preApprovalPlanClient.get({ id: planId });
    
    return {
      success: true,
      data: response
    };
  } catch (error) {
    console.error('Get Plan Error:', error);
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