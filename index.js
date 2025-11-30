import bodyParser from 'body-parser';
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import checkLoginRoute from './api/routes/auth/checkLogin.js';
import createSketchRoute from './api/routes/sketches/createSketch.js';
import cors from 'cors';

const app = express();
const host = process.env.PORT
const environment = process.env.ENVIRONMENT

const frontendURL = process.env.FRONTEND_URL_A;
const allowedOrigins = [
    frontendURL,
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


app.listen(3000, ()=>console.log(`listening on port ${host}`))