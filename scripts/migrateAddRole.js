import dotenv from 'dotenv';
import { connectDB } from '../database/db.js';
import { User } from '../models/user.model.js';

dotenv.config();

async function main() {
  try {
    await connectDB();
    const result = await User.updateMany(
      { role: { $exists: false } },
      { $set: { role: 'user' } }
    );
    console.log(`Modified ${result.modifiedCount} users to add default role`);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

main();