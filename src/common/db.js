import mongoose from 'mongoose';
import config from './config.js';
import logger from './logger.js';

export async function connectDB(customUri) {
  const uri = customUri || config.mongodb.uri;
  
  if (mongoose.connection.readyState === 1) {
    logger.info('MongoDB connection already established');
    return mongoose.connection;
  }

  try {
    mongoose.connection.on('connected', () => {
      logger.info(`MongoDB connected successfully to ${uri}`);
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    await mongoose.connect(uri, config.mongodb.options);
    return mongoose.connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error: error.message });
    throw error;
  }
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected cleanly');
  }
}

export default { connectDB, disconnectDB };
