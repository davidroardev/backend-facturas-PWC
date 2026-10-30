// src/services/auth.service.ts
import 'dotenv/config';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { prisma } from '../config/prisma';
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

function errorDeToken(mensaje: string): Error & { statusCode: number } {
    const error = new Error(mensaje) as Error & { statusCode: number };
    error.statusCode = 401;
    return error;
}

export class AuthService {
    static async registrarUsuario(datos: { nombre: string; correo: string; contrasena: string; telefono?: string }) {
        const existe = await prisma.usuario.findUnique({
            where: { correo: datos.correo }
        });

        if (existe) {
            throw new Error('El correo ya se encuentra registrado');
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
    
        const usuario = await prisma.usuario.findUnique({
            where: { correo }
        });

        if (!usuario) {
            throw new Error('Credenciales inválidas');
        }

        const esValida = await bcrypt.compare(contrasena, usuario.contrasena);

        if (!esValida) {
            throw new Error('Credenciales inválidas');
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

    /** Verifica la firma y la vigencia del JWT. Lanza error 401 si no es válido. */
    static verificarToken(token: string): TokenPayload {
        let decodificado: string | JwtPayload;

        try {
            decodificado = jwt.verify(token, JWT_SECRET);
        } catch (error) {
            if (error instanceof Error && error.name === 'TokenExpiredError') {
                throw errorDeToken('El token expiró, inicie sesión nuevamente');
            }

            throw errorDeToken('Token inválido');
        }

        if (
            typeof decodificado === 'string' ||
            typeof decodificado.id !== 'number' ||
            typeof decodificado.correo !== 'string' ||
            typeof decodificado.nombre !== 'string'
        ) {
            throw errorDeToken('Token inválido');
        }

        return {
            id: decodificado.id,
            correo: decodificado.correo,
            nombre: decodificado.nombre,
        };
    }
}
