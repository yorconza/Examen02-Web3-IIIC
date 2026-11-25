import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import db from '../data/_db.js';
import { Categories, Suppliers, Products, Users } from './models.js';

await mongoose.connect(process.env.MONGO_URI!, { dbName: process.env.MONGO_DB });

// Limpia las colecciones para poder ejecutar el seed varias veces
await Promise.all([
    Categories.deleteMany({}),
    Suppliers.deleteMany({}),
    Products.deleteMany({}),
    Users.deleteMany({}),
]);

await Categories.insertMany(db.categories);
await Suppliers.insertMany(db.suppliers);
await Products.insertMany(db.products);

await Users.insertMany([
    {
        fullName: 'Merlina Addams',
        username: 'meraddams',
        email: 'maddams@northwind.com',
        password: await bcrypt.hash('tomasa', 10),
        role: 'USER',
    },

    {
        fullName: 'Morticia Addams',
        username: 'moraddams',
        email: 'moddams@northwind.com',
        password: await bcrypt.hash('cleopatra', 10),
        role: 'ADMIN',
    },
]);

console.log('Seed completo: categories, suppliers, products y users');
await mongoose.disconnect();