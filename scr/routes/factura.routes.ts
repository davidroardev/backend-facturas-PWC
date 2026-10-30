// src/routes/factura.routes.ts
import { Router } from 'express';
import { FacturaController } from '../controllers/factura.controller';
import { uploadMiddleware } from '../middleware/upload.middleware';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas de facturas requieren un JWT válido
router.use(authMiddleware);

// POST /api/facturas - Carga de archivo e invocación LLM
router.post('/', uploadMiddleware.single('archivo'), FacturaController.cargar);

// Rutas de consulta y reportes
router.get('/', FacturaController.listar);
router.get('/reportes/resumen', FacturaController.reporteResumen);
router.get('/:id', FacturaController.obtenerDetalle);
router.put('/:id', FacturaController.actualizar);
router.delete('/:id', FacturaController.eliminar);

export default router;
