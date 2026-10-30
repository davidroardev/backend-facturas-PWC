import { prisma } from '../config/prisma'
import { FacturaExtraidaLLM } from './llm.service';

export class FacturaService {

    static async procesarYGuardarFactura(params: {
        file: Express.Multer.File;
        usuarioId: number;
        datosLLM: FacturaExtraidaLLM;
        rawJson: any;
    }) {
        const { file, usuarioId, datosLLM, rawJson } = params;

        // Transacción atómica en la base de datos
        return await prisma.$transaction(async (tx) => {
            // 1. Obtener o crear el proveedor
            let proveedor = await tx.proveedor.findFirst({
            where: {
                OR: [
                ...(datosLLM.nitProveedor ? [{ nit: datosLLM.nitProveedor }] : []),
                { nombre: { equals: datosLLM.nombreProveedor, mode: 'insensitive' } },
                ],
            },
            });

            if (!proveedor) {
                proveedor = await tx.proveedor.create({
                    data: {
                        nombre: datosLLM.nombreProveedor,
                        nit: datosLLM.nitProveedor || null,
                    },
                });
            }

            // 2. Verificar duplicado de factura (proveedor + numero_factura)
            const facturaExistente = await tx.factura.findUnique({
                where: {
                    uq_proveedor_factura: {
                        proveedorId: proveedor.id,
                        numeroFactura: datosLLM.numeroFactura,
                    },
                },
            });

            if (facturaExistente) {
                const error: any = new Error(`La factura N° ${datosLLM.numeroFactura} para el proveedor ${proveedor.nombre} ya existe.`);
                error.statusCode = 409; // Conflict
                throw error;
            }

            // 3. Obtener o crear el tipo de factura / servicio
            let tipoFactura = null;
            if (datosLLM.tipoServicio) {
                    tipoFactura = await tx.tipoFactura.upsert({
                    where: { servicioOTipo: datosLLM.tipoServicio },
                    update: {},
                    create: { servicioOTipo: datosLLM.tipoServicio },
                });
            }

            // 4. Crear el registro del documento
            const documento = await tx.documento.create({
                data: {
                    nombreDocumento: file.originalname,
                    tipoDocumento: file.mimetype,
                    tamanoBytes: file.size,
                    respuestaLlm: rawJson,
                    estadoProcesamiento: 'EXITOSO',
                },
            });

            // 5. Crear el registro de la factura asociada
            const nuevaFactura = await tx.factura.create({
                data: {
                    numeroFactura: datosLLM.numeroFactura,
                    numeroContrato: datosLLM.numeroContrato || null,
                    numeroCliente: datosLLM.numeroCliente || null,
                    valorAPagar: datosLLM.valorAPagar,
                    tipoDeMoneda: datosLLM.tipoDeMoneda || 'COP',
                    fechaEmision: datosLLM.fechaEmision ? new Date(datosLLM.fechaEmision) : null,
                    fechaLimitePago: datosLLM.fechaLimitePago ? new Date(datosLLM.fechaLimitePago) : null,
                    proveedorId: proveedor.id,
                    tipoFacturaId: tipoFactura ? tipoFactura.id : null,
                    usuarioSubidaId: usuarioId,
                    documentoId: documento.id,
                },
                include: {
                    proveedor: true,
                    tipoFactura: true,
                    documento: true,
                },
            });

            return nuevaFactura;
        });
    }

    static async listarFacturas(query: {
        page?: string;
        pageSize?: string;
        proveedorId?: string;
        fechaInicio?: string;
        fechaFin?: string;
    }) {
        
        const page = Math.max(1, Number(query.page) || 1);
        const pageSize = Math.max(1, Number(query.pageSize) || 10);
        const skip = (page - 1) * pageSize;

        const whereClause: any = {};

        if (query.proveedorId) {
            whereClause.proveedorId = Number(query.proveedorId);
        }

        if (query.fechaInicio || query.fechaFin) {
            whereClause.fechaEmision = {};
            if (query.fechaInicio) whereClause.fechaEmision.gte = new Date(query.fechaInicio);
            if (query.fechaFin) whereClause.fechaEmision.lte = new Date(query.fechaFin);
        }

        const [total, facturas] = await Promise.all([
            prisma.factura.count({ where: whereClause }),
            prisma.factura.findMany({
                where: whereClause,
                take: pageSize,
                skip: skip,
                orderBy: { fechaSubida: 'desc' },
                include: {
                    proveedor: true,
                    tipoFactura: true,
                    usuarioSubida: { select: { id: true, nombre: true, correo: true } }
                }
            })
        ]);

        return {
            totalItems: total,
            totalPages: Math.ceil(total / pageSize),
            currentPage: page,
            pageSize,
            data: facturas
            };
        }

    static async obtenerPorId(id: number) {
        const factura = await prisma.factura.findUnique({
            where: { id },
            include: {
                proveedor: true,
                tipoFactura: true,
                documento: true,
                usuarioSubida: { select: { id: true, nombre: true, correo: true } }
            }
        });

        if (!factura) throw new Error('Factura no encontrada');
        
        return factura;
    }
    
    static async actualizarFactura(id: number, data:{
        numeroFactura?: string,
        valorAPagar?: number,
        tipoMoneda?: string,
        fechaEmision?: Date,
        fechaLimitePago?: Date,
        numeroContrato?: string,
        provedorId?: number,
        tipoFacturaId?: number,
        usuarioSubidaId?: number
    }) {
        return prisma.factura.update({
            where: { id },
            data
            
        })
    }

    static async eliminarFactura(id: number) {
        return await prisma.factura.delete({
            where: {id}
        });
    }

    static async obtenerReporteResumen() {
        const resumen = await prisma.$queryRaw`
        SELECT 
            p.nombre AS "proveedor",
            TO_CHAR(f.fecha_emision, 'YYYY-MM') AS "mes",
            f.tipo_de_moneda AS "moneda",
            SUM(f.valor_a_pagar) AS "totalFacturado",
            COUNT(f.id)::INT AS "cantidadFacturas"
        FROM facturas f
        JOIN proveedores p ON f.proveedor_id = p.id
        GROUP BY p.nombre, TO_CHAR(f.fecha_emision, 'YYYY-MM'), f.tipo_de_moneda
        ORDER BY "mes" DESC, p.nombre ASC;
        `;
        return resumen;
    }

}