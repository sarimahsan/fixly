import { connectDB, disconnectDB } from '../src/common/db.js';
import mongoose from 'mongoose';

async function checkDatabase() {
  console.log('--- Fixly MongoDB Database Status Inspector ---\n');
  try {
    const connection = await connectDB();
    const db = connection.db;

    const collections = await db.listCollections().toArray();
    console.log(`Connected Database: ${db.databaseName}`);
    console.log(`Total Collections: ${collections.length}\n`);

    if (collections.length === 0) {
      console.log('No collections created yet. (Collections are created automatically upon inserting documents or syncing indexes).');
    } else {
      console.log('Collections & Document Counts:');
      console.log('------------------------------');
      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        const indexes = await db.collection(col.name).indexes();
        console.log(` - Collection: ${col.name.padEnd(25)} Documents: ${count.toString().padEnd(6)} Indexes: ${indexes.length}`);
      }
    }
    console.log('\n------------------------------');
    console.log('Database Status: HEALTHY & ONLINE');
  } catch (error) {
    console.error('Error connecting to MongoDB database:', error.message);
  } finally {
    await disconnectDB();
  }
}

checkDatabase();
