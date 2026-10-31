// src/app.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Importación de rutas
import authRoutes from './routes/auth.routes';
import facturaRoutes from './routes/factura.routes';
import { auditMiddleware } from './middleware/audit.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

dotenv.config();

const app = express();

// Auditoría de todas las peticiones (primero, para capturar también errores de parseo)
app.use(auditMiddleware);

// Middlewares básicos
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Definición de Rutas Principales
app.use('/api/auth', authRoutes);
app.use('/api/facturas', facturaRoutes);

// Manejo centralizado de errores (siempre al final)
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});

export default app;