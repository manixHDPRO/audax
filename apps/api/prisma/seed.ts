import { PrismaClient, UserRole, AccessLevel, RoomStatus, NotificationType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Audax2026!', 12);

  const cabinets = await Promise.all([
    prisma.cabinet.upsert({
      where: { name: 'Cabinet CEMG' },
      update: {},
      create: { name: 'Cabinet CEMG' },
    }),
    prisma.cabinet.upsert({
      where: { name: 'Cabinet Adjoint' },
      update: {},
      create: { name: 'Cabinet Adjoint' },
    }),
  ]);

  const cabCEMG = cabinets.find(c => c.name === 'Cabinet CEMG')!;

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@audax.fardc.cd' },
      update: {},
      create: {
        email: 'admin@audax.fardc.cd',
        passwordHash,
        firstName: 'Jean',
        lastName: 'Mukendi',
        role: UserRole.ADMIN,
      },
    }),
    prisma.user.upsert({
      where: { email: 'chef@audax.fardc.cd' },
      update: { cabinetId: cabCEMG.id },
      create: {
        email: 'chef@audax.fardc.cd',
        passwordHash,
        firstName: 'Général',
        lastName: 'Kabongo',
        role: UserRole.CHEF,
        cabinetId: cabCEMG.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'cemg@audax.fardc.cd' },
      update: { cabinetId: cabCEMG.id },
      create: {
        email: 'cemg@audax.fardc.cd',
        passwordHash,
        firstName: 'Chef',
        lastName: 'EMG',
        role: UserRole.CEMG,
        cabinetId: cabCEMG.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'secretaire@audax.fardc.cd' },
      update: { cabinetId: cabCEMG.id },
      create: {
        email: 'secretaire@audax.fardc.cd',
        passwordHash,
        firstName: 'Marie',
        lastName: 'Tshisekedi',
        role: UserRole.SECRETAIRE,
        cabinetId: cabCEMG.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'officier@audax.fardc.cd' },
      update: { cabinetId: cabCEMG.id },
      create: {
        email: 'officier@audax.fardc.cd',
        passwordHash,
        firstName: 'Capitaine',
        lastName: 'Lubala',
        role: UserRole.PROTOCOL,
        cabinetId: cabCEMG.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'salle@audax.fardc.cd' },
      update: { cabinetId: cabCEMG.id },
      create: {
        email: 'salle@audax.fardc.cd',
        passwordHash,
        firstName: 'Agent',
        lastName: 'Accueil',
        role: UserRole.SALLE_ATTENTE,
        cabinetId: cabCEMG.id,
      },
    }),
  ]);

  const bureaus = await Promise.all([
    prisma.bureau.upsert({
      where: { name: 'Bureau Opérations' },
      update: {},
      create: { name: 'Bureau Opérations' },
    }),
    prisma.bureau.upsert({
      where: { name: 'Bureau Renseignement' },
      update: {},
      create: { name: 'Bureau Renseignement' },
    }),
    prisma.bureau.upsert({
      where: { name: 'Bureau Logistique' },
      update: {},
      create: { name: 'Bureau Logistique' },
    }),
    prisma.bureau.upsert({
      where: { name: 'Bureau Transmission' },
      update: {},
      create: { name: 'Bureau Transmission' },
    }),
  ]);

  await Promise.all([
    prisma.visitor.upsert({
      where: { badgeCode: 'VIS-001' },
      update: {},
      create: {
        firstName: 'Ambassadeur',
        lastName: 'Dupont',
        organization: 'Ambassade de France',
        function: 'Ambassadeur',
        email: 'contact@amb-fr.cd',
        accessLevel: AccessLevel.VIP,
        badgeCode: 'VIS-001',
      },
    }),
    prisma.visitor.upsert({
      where: { badgeCode: 'VIS-002' },
      update: {},
      create: {
        firstName: 'Colonel',
        lastName: 'Mwangaza',
        organization: 'FARDC - État-Major',
        function: 'Officier supérieur',
        accessLevel: AccessLevel.RESTREINT,
        badgeCode: 'VIS-002',
      },
    }),
    prisma.visitor.upsert({
      where: { badgeCode: 'VIS-003' },
      update: {},
      create: {
        firstName: 'Dr.',
        lastName: 'Kabila',
        organization: 'Ministère des Affaires Étrangères',
        function: 'Conseiller',
        accessLevel: AccessLevel.STANDARD,
        badgeCode: 'VIS-003',
      },
    }),
  ]);

  for (const user of users) {
    const welcome = await prisma.notification.findFirst({
      where: { userId: user.id, title: 'Bienvenue sur AUDAX' },
    });
    if (!welcome) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: NotificationType.INFO,
          title: 'Bienvenue sur AUDAX',
          message: 'Plateforme de gestion stratégique des audiences — FARDC',
          link: '/dashboard',
        },
      });
    }
  }

  const seedLog = await prisma.auditLog.findFirst({
    where: { action: 'SEED', entity: 'System', entityId: 'init' },
  });
  if (!seedLog) {
    await prisma.auditLog.create({
      data: {
        userId: users[0].id,
        action: 'SEED',
        entity: 'System',
        entityId: 'init',
        ipAddress: '127.0.0.1',
        afterData: { message: 'Base de données initialisée' },
      },
    });
  }

  console.log('✅ Seed terminé — Comptes: admin@audax.fardc.cd / salle@audax.fardc.cd — Mot de passe: Audax2026!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
