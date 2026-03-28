import dotenv from 'dotenv';
import { connectDB } from '../database/db.js';
import { User } from '../models/user.model.js';

dotenv.config();

async function main() {
  try {
    await connectDB();
    const users = await User.find().lean();
    console.log('users', users);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

main();