// src/app.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Importación de rutas
import authRoutes from './routes/auth.routes';
import facturaRoutes from './routes/factura.routes';

dotenv.config();

const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Definición de Rutas Principales
app.use('/api/auth', authRoutes);

app.use('/api/facturas', facturaRoutes);


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});

export default app;