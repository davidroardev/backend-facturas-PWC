// src/services/auth.service.ts
import { prisma } from '../config/prisma';
import bcrypt from 'bcrypt';

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
}