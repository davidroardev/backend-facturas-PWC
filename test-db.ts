// test-db.ts
import "dotenv/config";                                    
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env["DATABASE_URL"];
if (!connectionString) {
  throw new Error("Falta DATABASE_URL en el entorno (.env)");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter })

async function main() {
  // 1. Verificar cuáles tablas existen en la base de datos
  const tablas: Array<{ tablename: string }> = await prisma.$queryRaw`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public';
  `;

  console.log('Conexión exitosa a PostgreSQL!');
  console.log('Tablas encontradas en la base de datos:');
  console.table(tablas);
}

main()
  .catch((e) => {
    console.error('Error de conexión con la base de datos:');
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });