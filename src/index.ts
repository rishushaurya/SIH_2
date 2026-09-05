import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { globalErrorHandler } from './gateway/errorHandler';
import router from './gateway/routes';
import { securityHeadersMiddleware } from './gateway/securityHeaders';

const app = express();

// 1. Perimeter Security & Middlewares
app.use(securityHeadersMiddleware);
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173'],
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 2. Mount Master API Gateway Router
app.use(router);

// 3. Global Structured Error Handler
app.use(globalErrorHandler);

// 4. Start HTTP Server
const server = app.listen(env.PORT, () => {
  console.log(`\n============================================================`);
  console.log(`  MAHALINK MIDDLEWARE GATEWAY RUNNING ON PORT ${env.PORT}`);
  console.log(`  Environment: ${env.NODE_ENV} | Demo Mode: ${env.DEMO_MODE}`);
  console.log(`  Health Check: http://localhost:${env.PORT}/health`);
  console.log(`============================================================\n`);
});

// 5. Graceful Shutdown Handler
const handleShutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Shutting down MahaLink Gateway gracefully...`);
  server.close(() => {
    console.log('HTTP server closed. Exiting process.');
    process.exit(0);
  });

  // Force shutdown if cleanup hangs
  setTimeout(() => {
    console.error('Forcefully terminating process after timeout.');
    process.exit(1);
  }, 3000);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export default app;
