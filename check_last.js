const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.researchRun.findFirst({ orderBy: { createdAt: 'desc' } })
  .then(run => {
    console.log(JSON.stringify(run, null, 2));
  })
  .catch(err => {
    console.error('Error:', err);
  })
  .finally(() => prisma.$disconnect());
