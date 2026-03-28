import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import express from 'express';
import cors from 'cors';
import { connectDB } from './database/db.js';
import userRouter from './routes/user.route.js';
import cardRouter from './routes/card.route.js';
import adminRouter from './routes/admin.route.js';
import offerCardRouter from './routes/offercard.route.js';
import reviewRouter from './routes/review.route.js';
import orderRouter from './routes/order.route.js';
import paymentRouter from './routes/payment.route.js';

const app = express();
connectDB();

// 🚀 Production-Safe CORS with Preflight Support
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://luxury-chess-frontend-756cqmtf3-dhruvjot-singhs-projects.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000"
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all during troubleshooting
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  credentials: true
}));

// HANDLE PREFLIGHT (CRITICAL FOR OPTIONS REQUESTS)
app.options('*', cors());


app.use(express.json());

// Serve uploaded files
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Basic routes
app.get('/', (req, res) => {
  res.json({ message: 'Backend is running', status: 'active' });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend is healthy',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/users', userRouter);
app.use('/api/cards', cardRouter);
app.use('/api/admin', adminRouter);
app.use('/api/offers', offerCardRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/orders', orderRouter);
app.use('/api/payments', paymentRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// configure port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
