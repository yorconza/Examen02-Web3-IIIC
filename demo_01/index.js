import 'dotenv/config';
import grpc from '@grpc/grpc-js';
import { northwind } from './config/proto.js';
import { connectDB } from './config/database.js';
import { authService } from './services/authService.js';
import { productService } from './services/productService.js';

const PORT = process.env.PORT || 50051;

await connectDB();

const server = new grpc.Server();
server.addService(northwind.AuthService.service, authService);
server.addService(northwind.ProductService.service, productService);

server.bindAsync(
    `0.0.0.0:${PORT}`,
    grpc.ServerCredentials.createInsecure(),
    async (error) => {
        if (error) {
            console.error('No se pudo iniciar el servidor gRPC:', error);
            process.exit(1);
        }
        console.log(`Servidor gRPC escuchando en el puerto ${PORT}`);

        // Con el servidor gRPC ya listo, levanta también la página web
        await import('./web.js');
    }
);