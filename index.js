import bodyParser from 'body-parser';
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import checkLoginRoute from './api/routes/auth/checkLogin.js';
import createSketchRoute from './api/routes/sketches/createSketch.js';
import paymentRoute from './api/routes/payment/payment.js';
import cors from 'cors';
import validateCaptchaRoute from './api/routes/auth/validateCaptcha.js';
import createPlansRoute from './api/routes/payment/mercadopago.js';

const app = express();
const host = process.env.PORT
const environment = process.env.ENVIRONMENT

const frontendURLA = process.env.FRONTEND_URL_A;
const frontendURLB = process.env.FRONTEND_URL_B;
const allowedOrigins = [
    frontendURLA,
    frontendURLB
];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true); // Allow requests with no origin (e.g., mobile apps)
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'), false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(bodyParser.json());

app.use('/auth/check-login', checkLoginRoute);
app.use('/sketches/create-sketch', createSketchRoute);
app.use('/payment', paymentRoute)
app.use('/validate-captcha', validateCaptchaRoute);
app.use('/create-plans', createPlansRoute);


app.listen(3000, ()=>console.log(`listening on port ${host}`))