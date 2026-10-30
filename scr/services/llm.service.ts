// src/services/llm.service.ts
import { GoogleGenAI, Type } from '@google/genai';

const apiKey = process.env.LLM_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export interface FacturaExtraidaLLM {
        numeroFactura: string;
        nombreProveedor: string;
        nitProveedor?: string;
        valorAPagar: number;
        tipoDeMoneda: string;
        fechaEmision?: string; // Formato YYYY-MM-DD
        fechaLimitePago?: string; // Formato YYYY-MM-DD
        numeroContrato?: string;
        numeroCliente?: string;
        tipoServicio?: string; // Agua, Energía, Gas, Telecomunicaciones, etc.
    }

export class LlmService {
    static async extraerDatosFactura(fileBuffer: Buffer, mimeType: string): Promise<{ datos: FacturaExtraidaLLM; rawJson: any }> {
        const prompt = `
            Eres un sistema experto en extracción de datos de facturas de servicios públicos y privados.
            Analiza el documento adjunto y extrae los siguientes datos:
            - numeroFactura (obligatorio) (ten en cuenta que este numero de factura puede estar en los bordes de la factura y que puede estar en diferentes formatos, como "Factura No. 12345", "No. 12345", "Factura #12345",  "EQUIVALENTE ELECTRONICO No. 12345"etc.)
            - nombreProveedor (obligatorio)(si no lo encuentras responde con un NoEspecificado)
            - valorAPagar (número decimal sin símbolos de moneda ni comas de miles)
            - tipoDeMoneda (código de 3 letras como COP, USD)
            - fechaEmision (formato YYYY-MM-DD si está disponible)
            - fechaLimitePago (formato YYYY-MM-DD si está disponible)
            - numeroContrato (opcional) 
            - numeroCliente (opcional) 
            - tipoServicio (ej. Energía, Agua, Gas, Telecomunicaciones)(Si no lo reconoces responde con un NoEspecificado)
        `;
    
        // Convertir el buffer del archivo cargado a base64
        const base64Data = fileBuffer.toString('base64');
        
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            contents: [
                {
                    role: 'user',
                    parts: [
                    { text: prompt },
                    {
                        inlineData: {
                        mimeType,
                        data: base64Data,
                        },
                    },
                    ],
                },
            ],
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                type: Type.OBJECT,
                    properties: {
                        numeroFactura: { type: Type.STRING },
                        nombreProveedor: { type: Type.STRING },
                        nitProveedor: { type: Type.STRING },
                        valorAPagar: { type: Type.NUMBER },
                        tipoDeMoneda: { type: Type.STRING },
                        fechaEmision: { type: Type.STRING },
                        fechaLimitePago: { type: Type.STRING },
                        numeroContrato: { type: Type.STRING },
                        numeroCliente: { type: Type.STRING },
                        tipoServicio: { type: Type.STRING },
                    },
                required: ['numeroFactura', 'nombreProveedor', 'valorAPagar', 'tipoDeMoneda'],
                },
            },
        });
        const textResponse = response.text || '{}';
        const jsonParsed = JSON.parse(textResponse);
        return {
            datos: jsonParsed as FacturaExtraidaLLM,
            rawJson: jsonParsed,
        };
    }
}