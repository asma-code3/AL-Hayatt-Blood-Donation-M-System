import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { securityHeaders } from './middleware/security.js';
import apiRoutes from './routes/index.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(securityHeaders);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.frontendUrls.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('This frontend origin is not allowed by CORS.'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

if (env.logRequests) {
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));
}

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Blood donation backend API',
  });
});

app.use('/api', apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
