// src/middleware/error.middleware.ts
import { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { Prisma } from '@prisma/client';
import { HttpError } from '../errors/http-error';

interface CuerpoError {
  ok: false;
  mensaje: string;
  codigo?: string;
  detalles?: unknown;
}

interface ErrorMapeado {
  statusCode: number;
  cuerpo: CuerpoError;
}

const ES_PRODUCCION = process.env.NODE_ENV === 'production';

function conDetalles(cuerpo: CuerpoError, detalles: unknown): CuerpoError {
  return ES_PRODUCCION ? cuerpo : { ...cuerpo, detalles };
}

/** Traduce cualquier error (propio, de multer, de body-parser o de Prisma) a un status HTTP y un cuerpo seguro. */
function mapearError(error: unknown): ErrorMapeado {
  if (error instanceof HttpError) {
    const cuerpo: CuerpoError = { ok: false, mensaje: error.message };

    if (error.codigo !== undefined) cuerpo.codigo = error.codigo;
    if (error.detalles !== undefined) cuerpo.detalles = error.detalles;

    return { statusCode: error.statusCode, cuerpo };
  }

  // Errores de body-parser (express.json)
  const tipoBodyParser = (error as { type?: string } | null)?.type;

  if (tipoBodyParser === 'entity.parse.failed') {
    return {
      statusCode: 400,
      cuerpo: { ok: false, mensaje: 'El cuerpo de la petición no es un JSON válido.', codigo: 'JSON_INVALIDO' },
    };
  }

  if (tipoBodyParser === 'entity.too.large') {
    return {
      statusCode: 413,
      cuerpo: { ok: false, mensaje: 'El cuerpo de la petición es demasiado grande.', codigo: 'CUERPO_DEMASIADO_GRANDE' },
    };
  }

  // Errores de multer
  if (error instanceof MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return {
        statusCode: 413,
        cuerpo: { ok: false, mensaje: 'El archivo supera el tamaño máximo permitido (10 MB).', codigo: 'ARCHIVO_DEMASIADO_GRANDE' },
      };
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return {
        statusCode: 400,
        cuerpo: { ok: false, mensaje: 'Campo de archivo inesperado. Envíe el archivo en el campo "archivo".', codigo: 'CAMPO_ARCHIVO_INVALIDO' },
      };
    }

    return {
      statusCode: 400,
      cuerpo: { ok: false, mensaje: 'No se pudo procesar el archivo enviado.', codigo: error.code },
    };
  }

  // Errores conocidos de Prisma
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return {
          statusCode: 409,
          cuerpo: { ok: false, mensaje: 'Ya existe un registro con esos datos.', codigo: 'REGISTRO_DUPLICADO' },
        };
      case 'P2025':
        return {
          statusCode: 404,
          cuerpo: { ok: false, mensaje: 'El registro solicitado no existe.', codigo: 'REGISTRO_NO_ENCONTRADO' },
        };
      case 'P2023':
        return {
          statusCode: 400,
          cuerpo: { ok: false, mensaje: 'Identificador inválido.', codigo: 'ID_INVALIDO' },
        };
      case 'P2003':
        return {
          statusCode: 400,
          cuerpo: { ok: false, mensaje: 'Referencia inválida: el registro relacionado no existe.', codigo: 'REFERENCIA_INVALIDA' },
        };
      default:
        return {
          statusCode: 400,
          cuerpo: { ok: false, mensaje: 'No se pudo completar la operación en la base de datos.', codigo: error.code },
        };
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      statusCode: 400,
      cuerpo: { ok: false, mensaje: 'Datos inválidos para la operación.', codigo: 'DATOS_INVALIDOS' },
    };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      statusCode: 503,
      cuerpo: { ok: false, mensaje: 'Servicio de base de datos no disponible.', codigo: 'BD_NO_DISPONIBLE' },
    };
  }

  // Cualquier otro error: no se exponen detalles al cliente
  return {
    statusCode: 500,
    cuerpo: { ok: false, mensaje: 'Error interno del servidor.', codigo: 'ERROR_INTERNO' },
  };
}

/** Middleware 404 para rutas no registradas. */
export function notFoundHandler(req: Request, res: Response) {
  const ruta = req.originalUrl.split('?')[0] || req.path;

  return res.status(404).json({
    ok: false,
    mensaje: `Ruta no encontrada: ${req.method} ${ruta}`,
    codigo: 'RUTA_NO_ENCONTRADA',
  });
}

/** Middleware central de errores. Debe registrarse al final de app.ts (4 parámetros). */
export function errorHandler(error: unknown, req: Request, res: Response, next: NextFunction) {
  const { statusCode, cuerpo } = mapearError(error);

  if (statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl} -> ${statusCode}`, error);
  } else if (!ES_PRODUCCION) {
    console.warn(`[error] ${req.method} ${req.originalUrl} -> ${statusCode}: ${cuerpo.mensaje}`);
  }

  if (res.headersSent) {
    return next(error);
  }

  const respuesta = statusCode >= 500 && error instanceof Error ? conDetalles(cuerpo, error.message) : cuerpo;

  return res.status(statusCode).json(respuesta);
}
