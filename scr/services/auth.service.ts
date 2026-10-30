// src/services/auth.service.ts
import 'dotenv/config';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { HttpError } from '../errors/http-error';
import bcrypt from 'bcrypt';

export interface TokenPayload {
    id: number;
    correo: string;
    nombre: string;
}

const JWT_SECRET = process.env.JWT_SECRET?.trim() || '';

if (!JWT_SECRET) {
    throw new Error('Falta la variable de entorno JWT_SECRET en el archivo .env');
}

const OPCIONES_FIRMA: jwt.SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN?.trim() || '8h') as NonNullable<jwt.SignOptions['expiresIn']>,
};

export class AuthService {
    static async registrarUsuario(datos: { nombre: string; correo: string; contrasena: string; telefono?: string }) {
        if (!datos.nombre || !datos.correo || !datos.contrasena) {
            throw HttpError.badRequest('nombre, correo y contrasena son obligatorios.', { codigo: 'CAMPOS_REQUERIDOS' });
        }

        const existe = await prisma.usuario.findUnique({
            where: { correo: datos.correo }
        });

        if (existe) {
            throw HttpError.conflict('El correo ya se encuentra registrado.', { codigo: 'CORREO_REGISTRADO' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(datos.contrasena, salt);

        const nuevoUsuario = await prisma.usuario.create({
            data: {
                nombre: datos.nombre,
                correo: datos.correo,
                contrasena: hashPassword,
                telefono: datos.telefono ?? null
            },
            select: {
                id: true,
                nombre: true,
                correo: true,
                fechaCreacion: true
            }
        });

        return nuevoUsuario;
    }

    static async login(correo: string, contrasena: string) {
        if (typeof correo !== 'string' || typeof contrasena !== 'string' || !correo || !contrasena) {
            throw HttpError.badRequest('correo y contrasena son obligatorios.', { codigo: 'CAMPOS_REQUERIDOS' });
        }

        const usuario = await prisma.usuario.findUnique({
            where: { correo }
        });

        if (!usuario) {
            throw HttpError.unauthorized('Credenciales inválidas.', { codigo: 'CREDENCIALES_INVALIDAS' });
        }

        const esValida = await bcrypt.compare(contrasena, usuario.contrasena);

        if (!esValida) {
            throw HttpError.unauthorized('Credenciales inválidas.', { codigo: 'CREDENCIALES_INVALIDAS' });
        }

            return usuario;
    }

    /** Firma un JWT con los datos mínimos del usuario autenticado. */
    static generarToken(usuario: TokenPayload): string {
        const payload: TokenPayload = {
            id: usuario.id,
            correo: usuario.correo,
            nombre: usuario.nombre,
        };

        return jwt.sign(payload, JWT_SECRET, OPCIONES_FIRMA);
    }

    /** Verifica la firma y la vigencia del JWT. Lanza HttpError 401 si no es válido. */
    static verificarToken(token: string): TokenPayload {
        let decodificado: string | JwtPayload;

        try {
            decodificado = jwt.verify(token, JWT_SECRET);
        } catch (error) {
            if (error instanceof Error && error.name === 'TokenExpiredError') {
                throw HttpError.unauthorized('El token expiró, inicie sesión nuevamente.', { codigo: 'TOKEN_EXPIRADO' });
            }

            throw HttpError.unauthorized('Token inválido.', { codigo: 'TOKEN_INVALIDO' });
        }

        if (
            typeof decodificado === 'string' ||
            typeof decodificado.id !== 'number' ||
            typeof decodificado.correo !== 'string' ||
            typeof decodificado.nombre !== 'string'
        ) {
            throw HttpError.unauthorized('Token inválido.', { codigo: 'TOKEN_INVALIDO' });
        }

        return {
            id: decodificado.id,
            correo: decodificado.correo,
            nombre: decodificado.nombre,
        };
    }
}
