import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

let dbConnection;

export async function connectDB() {
    if (!dbConnection) {
        try {
            await client.connect();
            // Selecciona el nombre de tu base de datos (ej: northwind)
            dbConnection = client.db('Northwind');
            console.log('Conexión exitosa a MongoDB');
        } catch (error) {
            console.error('Error al conectar a la base de datos:', error);
            process.exit(1);
        }
    }
    return dbConnection;
}