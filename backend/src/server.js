import app from './app.js';
import { env } from './config/env.js';
import { initializeDatabase } from './db/database.js';

const startServer = async () => {
  await initializeDatabase();

  app.listen(env.port, () => {
    console.log(`Backend server running on http://localhost:${env.port}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});
