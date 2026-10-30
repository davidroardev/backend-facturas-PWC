// src/middleware/audit.middleware.ts
import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma';

// Límites reales de las columnas en logs_api (varchar)
const MAX_RUTA = 255;
const MAX_METODO = 10;

function truncar(valor: string, maximo: number): string {
  return valor.length > maximo ? valor.slice(0, maximo) : valor;
}

/**
 * Registra en `logs_api` cada petición HTTP atendida: método, ruta,
 * código de respuesta y usuario autenticado (si lo hay).
 *
 * Se engancha al evento `finish` de la respuesta para conocer el código
 * final y para que `req.user` ya esté disponible (el middleware de auth
 * se ejecuta después de registrar el listener).
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  res.on('finish', () => {
    const usuarioId = (req as any).user?.id ?? null;
    const metodoHttp = truncar(req.method, MAX_METODO);
    const ruta = truncar(req.originalUrl.split('?')[0] || req.path, MAX_RUTA);

    prisma.logApi
      .create({
        data: {
          usuarioId,
          metodoHttp,
          ruta,
          codigoEstado: res.statusCode,
        },
      })
      .catch((error: unknown) => {
        const mensaje = error instanceof Error ? error.message : String(error);
        console.error(`[auditoria] No se pudo registrar ${metodoHttp} ${ruta}: ${mensaje}`);
      });
  });

  next();
}
