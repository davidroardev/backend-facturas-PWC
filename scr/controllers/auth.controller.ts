// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
    static async registrar(req: Request, res: Response) {
        try {
            const { nombre, correo, contrasena, telefono } = req.body;
            const usuario = await AuthService.registrarUsuario({ nombre, correo, contrasena, telefono });
            const token = AuthService.generarToken(usuario);
            res.status(201).json({ ok: true, usuario, token });
        } catch (error: any) {
            res.status(400).json({ ok: false, mensaje: error.message });
        }
  }

    static async login(req: Request, res: Response) {
        try {
            const { correo, contrasena } = req.body;
            const usuario = await AuthService.login(correo, contrasena);
            const token = AuthService.generarToken(usuario);
          // Token JWT para consumir los endpoints protegidos
            res.status(200).json({
                ok: true,
                usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo },
                token,
            });
        } catch (error: any) {
            res.status(401).json({ ok: false, mensaje: error.message });
            }
    }
}
