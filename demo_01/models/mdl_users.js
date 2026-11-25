import { connectDB } from '../config/database.js';

export async function findByUsername(username) {
    const db = await connectDB();
    return db.collection('users').findOne({ username });
}