import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const definition = protoLoader.loadSync(
    path.join(__dirname, '../proto/northwind.proto'),
    {
        keepCase: true,   // mantiene category_id, min_price, etc. tal cual
        longs: String,
        enums: String,
        defaults: true,   // campos vacíos llegan como '' / 0 en lugar de undefined
        oneofs: true,
    }
);

export const northwind = grpc.loadPackageDefinition(definition).northwind;