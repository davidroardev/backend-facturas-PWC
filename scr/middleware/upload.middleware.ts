// src/middleware/upload.middleware.ts
import multer from 'multer';
import { Request } from 'express';
import { HttpError } from '../errors/http-error';


const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // 415 Unsupported Media Type
    cb(HttpError.unsupportedMediaType('Solo se admiten archivos PDF, PNG o JPG.', { codigo: 'FORMATO_NO_SOPORTADO' }));
  }
};

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB máximo
  },
  fileFilter,
});
