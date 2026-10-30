// src/errors/http-error.ts

export interface OpcionesHttpError {
  codigo?: string;
  detalles?: unknown;
  causa?: unknown;
}

/**
 * Error controlado con código HTTP asociado. Todo error de negocio debe
 * lanzarse como HttpError para que el middleware central lo traduzca
 * sin filtrar detalles internos.
 */
export class HttpError extends Error {
  readonly statusCode: number;
  readonly codigo?: string;
  readonly detalles?: unknown;

  constructor(statusCode: number, mensaje: string, opciones: OpcionesHttpError = {}) {
    super(mensaje);

    this.name = 'HttpError';
    this.statusCode = statusCode;

    if (opciones.codigo !== undefined) this.codigo = opciones.codigo;
    if (opciones.detalles !== undefined) this.detalles = opciones.detalles;
    if (opciones.causa !== undefined) this.cause = opciones.causa;
  }

  static badRequest(mensaje = 'Solicitud inválida', opciones?: OpcionesHttpError): HttpError {
    return new HttpError(400, mensaje, opciones);
  }

  static unauthorized(mensaje = 'No autenticado', opciones?: OpcionesHttpError): HttpError {
    return new HttpError(401, mensaje, opciones);
  }

  static forbidden(mensaje = 'Acceso denegado', opciones?: OpcionesHttpError): HttpError {
    return new HttpError(403, mensaje, opciones);
  }

  static notFound(mensaje = 'Recurso no encontrado', opciones?: OpcionesHttpError): HttpError {
    return new HttpError(404, mensaje, opciones);
  }

  static conflict(mensaje = 'Conflicto con el estado actual del recurso', opciones?: OpcionesHttpError): HttpError {
    return new HttpError(409, mensaje, opciones);
  }

  static unsupportedMediaType(mensaje = 'Tipo de contenido no soportado', opciones?: OpcionesHttpError): HttpError {
    return new HttpError(415, mensaje, opciones);
  }

  static payloadTooLarge(mensaje = 'El contenido enviado es demasiado grande', opciones?: OpcionesHttpError): HttpError {
    return new HttpError(413, mensaje, opciones);
  }
}
