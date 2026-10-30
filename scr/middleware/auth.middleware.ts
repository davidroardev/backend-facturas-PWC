// src/middleware/auth.middleware.ts
import { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

const PREFIJO_BEARER = 'Bearer ';

/**
 * Valida el JWT enviado en el header `Authorization: Bearer <token>`.
 * Si es válido, adjunta el payload a `req.user` y continúa la cadena.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const encabezado = req.headers.authorization;

  if (!encabezado || !encabezado.startsWith(PREFIJO_BEARER)) {
    return res.status(401).json({
      ok: false,
      mensaje: 'Token de autenticación requerido (Authorization: Bearer <token>)',
    });
  }

  const token = encabezado.slice(PREFIJO_BEARER.length).trim();

  if (!token) {
    return res.status(401).json({ ok: false, mensaje: 'El token enviado está vacío' });
  }

  try {
    (req as any).user = AuthService.verificarToken(token);
    return next();
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    const mensaje = error instanceof Error ? error.message : 'Token inválido';

    return res.status(statusCode).json({ ok: false, mensaje });
  }
}
