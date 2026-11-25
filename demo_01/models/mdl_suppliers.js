import { connectDB } from '../config/database.js';

const suppliers = async () => (await connectDB()).collection('suppliers');

// Busca por SupplierID (número de Northwind). Acepta "3" o 3.
export async function findById(id) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) return null;
    return (await suppliers()).findOne({ SupplierID: numericId });
}

export async function findAll() {
    return (await suppliers()).find().sort({ CompanyName: 1 }).toArray();
}