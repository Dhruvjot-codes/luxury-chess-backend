import dotenv from 'dotenv';
import { connectDB } from '../database/db.js';
import { User } from '../models/user.model.js';

dotenv.config();

async function main() {
  try {
    await connectDB();

    // Get email from command line argument
    const email = process.argv[2];
    if (!email) {
      console.error('Usage: node makeAdmin.js <email>');
      console.error('Example: node makeAdmin.js dhruv@gmail.com');
      process.exit(1);
    }

    // Find and update user
    const user = await User.findOneAndUpdate(
      { email },
      { role: 'admin' },
      { new: true }
    ).select('-password');

    if (!user) {
      console.error(`User with email "${email}" not found`);
      process.exit(1);
    }

    console.log(`Successfully promoted user to admin:`, {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
