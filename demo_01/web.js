import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import grpc from '@grpc/grpc-js';
import { northwind } from './config/proto.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GRPC_ADDRESS = `localhost:${process.env.PORT || 50051}`;
const WEB_PORT = process.env.WEB_PORT || 3000;

// Este servidor web es un CLIENTE gRPC: el navegador no puede hablar gRPC,
// así que le habla a este servidor por HTTP/JSON y este llama al servidor gRPC.
const credentials = grpc.credentials.createInsecure();
const clients = {
    AuthService: new northwind.AuthService(GRPC_ADDRESS, credentials),
    ProductService: new northwind.ProductService(GRPC_ADDRESS, credentials),
};

// code numérico -> nombre (16 -> UNAUTHENTICATED)
const statusName = Object.fromEntries(
    Object.entries(grpc.status).map(([name, code]) => [code, name])
);

const methodsOf = (service) => Object.keys(northwind[service].service);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Métodos disponibles (la página arma los selectores con esto)
app.get('/api/methods', (req, res) => {
    res.json(Object.fromEntries(Object.keys(clients).map((s) => [s, methodsOf(s)])));
});

// Ejecuta una llamada gRPC con el header authorization que envíe la página
app.post('/api/call', (req, res) => {
    const { service, method, request = {}, authorization = '' } = req.body ?? {};

    const known = Object.hasOwn(clients, service) && methodsOf(service).includes(method);
    if (!known || typeof request !== 'object' || request === null) {
        return res.status(400).json({
            ok: false,
            error: { code: 3, status: 'INVALID_ARGUMENT', message: 'Servicio, método o request inválido' },
        });
    }

    const metadata = new grpc.Metadata();
    if (authorization) metadata.add('authorization', authorization);

    const options = { deadline: Date.now() + 5000 }; // no se queda colgado si el servidor gRPC está apagado

    clients[service][method](request, metadata, options, (error, response) => {
        if (error) {
            return res.json({
                ok: false,
                error: {
                    code: error.code,
                    status: statusName[error.code] ?? 'UNKNOWN',
                    message: error.details || error.message,
                },
            });
        }
        res.json({ ok: true, response });
    });
});

app.listen(WEB_PORT, '127.0.0.1', () => {
    console.log(`Página web lista en http://localhost:${WEB_PORT}`);
});