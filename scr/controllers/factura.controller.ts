
// src/controllers/factura.controller.ts

import { Request, Response } from 'express';
import { FacturaService } from '../services/factura.service';
import { LlmService } from '../services/llm.service';

export class FacturaController {

    static async cargar(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ ok: false, mensaje: 'Debe adjuntar un archivo válido (PDF, PNG o JPG).' });
            }

            // temporalmente asignamos id 1 hasta conectar el middleware de auth JWT
            const usuarioId = (req as any).user?.id || 2; 

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
        } catch (error: any) {
            const statusCode = error.statusCode || 500;
            res.status(statusCode).json({ ok: false, mensaje: error.message });
        }     
    }


    static async listar(req: Request, res: Response) {
        try {
            const resultado = await FacturaService.listarFacturas(req.query);
            res.status(200).json({ ok: true, ...resultado });
        } catch (error: any) {
            res.status(500).json({ ok: false, mensaje: error.message });
        }
    }

    static async obtenerDetalle(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            const factura = await FacturaService.obtenerPorId(id);
            res.status(200).json({ ok: true, factura });
        } catch (error: any) {
            res.status(404).json({ ok: false, mensaje: error.message });
        }
    }

    static async actualizar(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            const facturaActualizada = await FacturaService.actualizarFactura(id, req.body);
            res.status(200).json({ ok: true, factura: facturaActualizada });
        } catch (error: any) {
            res.status(400).json({ ok: false, mensaje: error.message });
        }
    }

    static async eliminar(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            await FacturaService.eliminarFactura(id);
            res.status(200).json({ ok: true, mensaje: 'Factura eliminada correctamente' });
        } catch (error: any) {
            res.status(400).json({ ok: false, mensaje: error.message });
        }
    }

    static async reporteResumen(req: Request, res: Response) {
        try {
            const reporte = await FacturaService.obtenerReporteResumen();
            res.status(200).json({ ok: true, reporte });
        } catch (error: any) {
            res.status(500).json({ ok: false, mensaje: error.message });
        }
    }
}