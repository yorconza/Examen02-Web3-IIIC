import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    CategoryID: { type: Number, required: true, unique: true },
    CategoryName: { type: String, required: true },
    Description: { type: String, required: true },
});

const supplierSchema = new mongoose.Schema({
    SupplierID: { type: Number, required: true, unique: true },
    CompanyName: { type: String, required: true },
    ContactName: { type: String, required: true },
    ContactTitle: { type: String, required: true },
    Country: { type: String, required: true },
    City: { type: String, required: true },
    Address: { type: String, required: true },
});

const productSchema = new mongoose.Schema({
    ProductID: { type: Number, required: true, unique: true },
    ProductName: { type: String, required: true },
    SupplierID: { type: Number, required: true },
    CategoryID: { type: Number, required: true },
    QuantityPerUnit: { type: String, required: true },
    UnitPrice: { type: Number, required: true },
    UnitsInStock: { type: Number, required: true },
    ReorderLevel: { type: Number, required: true },
});

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // se guarda el hash bcrypt
    role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
});


export const Categories = mongoose.model('Categories', categorySchema, 'categories');
export const Suppliers = mongoose.model('Suppliers', supplierSchema, 'suppliers');
export const Products = mongoose.model('Products', productSchema, 'products');
export const Users = mongoose.model('Users', userSchema, 'users');
