import bcrypt from 'bcryptjs';
import { connectDB } from './config/database.js';

const db = await connectDB();
const users = db.collection('users'); // <- debe ser el nombre EXACTO de tu colección

const all = await users.find().toArray();
console.log(`Usuarios encontrados en "users": ${all.length}`);

if (all.length === 0) {
    const names = (await db.listCollections().toArray()).map((c) => c.name);
    console.log('Colecciones que existen en la base:', names);
}

let updated = 0;
for (const user of all) {
    if (typeof user.password !== 'string') continue;
    if (user.password.startsWith('$2')) continue; // ya está cifrada

    await users.updateOne(
        { _id: user._id },
        { $set: { password: await bcrypt.hash(user.password, 10) } }
    );
    updated++;
}

console.log(`Contraseñas cifradas: ${updated}`);
process.exit(0);