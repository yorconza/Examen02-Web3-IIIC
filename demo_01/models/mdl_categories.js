import { connectDB } from '../config/database.js';

const categories = async () => (await connectDB()).collection('categories');

export async function findAll() {
    return (await categories()).find().sort({ CategoryName: 1 }).toArray();
}

// Busca por CategoryID (número de Northwind). Acepta "3" o 3.
export async function findById(id) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) return null;
    return (await categories()).findOne({ CategoryID: numericId });
}