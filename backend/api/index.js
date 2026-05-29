import app from '../src/app.js';
import { initializeDatabase } from '../src/db/database.js';

let databaseReadyPromise;

const ensureDatabaseReady = () => {
  if (!databaseReadyPromise) {
    databaseReadyPromise = initializeDatabase().catch((error) => {
      databaseReadyPromise = undefined;
      throw error;
    });
  }

  return databaseReadyPromise;
};

export default async function handler(req, res) {
  try {
    await ensureDatabaseReady();
    return app(req, res);
  } catch (error) {
    console.error('Failed to initialize backend:', error);
    return res.status(500).json({
      success: false,
      message: 'The server could not connect to the database. Please try again later.',
    });
  }
}
