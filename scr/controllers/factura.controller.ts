
// src/controllers/factura.controller.ts

import { Request, Response } from 'express';
import { FacturaService } from '../services/factura.service';
import { LlmService } from '../services/llm.service';
import { HttpError } from '../errors/http-error';

export class FacturaController {

    static async cargar(req: Request, res: Response) {
        if (!req.file) {
            throw HttpError.badRequest('Debe adjuntar un archivo válido (PDF, PNG o JPG).', { codigo: 'ARCHIVO_REQUERIDO' });
        }

        // El id proviene del JWT validado por authMiddleware
        const usuarioId = (req as any).user?.id;

        if (!usuarioId) {
            throw HttpError.unauthorized('Usuario no autenticado.');
        }

        // 1. Invocar extracción del LLM
        const { datos, rawJson } = await LlmService.extraerDatosFactura(
            req.file.buffer,
            req.file.mimetype
        );

        // 2. Guardar en Base de Datos mediante transacción
        const facturaCreada = await FacturaService.procesarYGuardarFactura({
            file: req.file,
            usuarioId,
            datosLLM: datos,
            rawJson,
        });

        res.status(201).json({
            ok: true,
            mensaje: 'Factura procesada y guardada exitosamente',
            factura: facturaCreada,
        });
    }

    static async listar(req: Request, res: Response) {
        const resultado = await FacturaService.listarFacturas(req.query);
        res.status(200).json({ ok: true, ...resultado });
    }

    static async obtenerDetalle(req: Request, res: Response) {
        const factura = await FacturaService.obtenerPorId(Number(req.params.id));
        res.status(200).json({ ok: true, factura });
    }

    static async actualizar(req: Request, res: Response) {
        const facturaActualizada = await FacturaService.actualizarFactura(Number(req.params.id), req.body);
        res.status(200).json({ ok: true, factura: facturaActualizada });
    }

    static async eliminar(req: Request, res: Response) {
        await FacturaService.eliminarFactura(Number(req.params.id));
        res.status(200).json({ ok: true, mensaje: 'Factura eliminada correctamente' });
    }

    static async reporteResumen(req: Request, res: Response) {
        const reporte = await FacturaService.obtenerReporteResumen();
        res.status(200).json({ ok: true, reporte });
    }
}
