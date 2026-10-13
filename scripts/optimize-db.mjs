import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function optimize() {
  try {
    const journal = await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
    console.log('Journal mode set:', journal);
    const sync = await prisma.$queryRawUnsafe('PRAGMA synchronous=NORMAL;');
    console.log('Synchronous mode set:', sync);
    const mmapSize = await prisma.$queryRawUnsafe('PRAGMA mmap_size=268435456;'); // 256MB memory map
    console.log('Mmap size set:', mmapSize);
    const cacheSize = await prisma.$queryRawUnsafe('PRAGMA cache_size=-64000;'); // 64MB cache
    console.log('Cache size set:', cacheSize);
    console.log('✅ SQLite performance optimizations applied successfully!');
  } catch (err) {
    console.error('Error optimizing DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

optimize();
