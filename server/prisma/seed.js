import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedDefaultSlots(prismaClient, userId) {
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const slotsData = [];

  // Days Group A Template: Monday, Tuesday, Wednesday, Thursday, and Saturday (17 slots)
  const groupATemplate = [
    { jam_ke: 1, jam_mulai: '07:00', jam_selesai: '07:35', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: 2, jam_mulai: '07:35', jam_selesai: '08:10', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: 3, jam_mulai: '08:10', jam_selesai: '08:45', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: 4, jam_mulai: '08:45', jam_selesai: '09:10', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: 5, jam_mulai: '09:10', jam_selesai: '09:45', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: null, jam_mulai: '09:45', jam_selesai: '10:10', is_istirahat: true, keterangan: 'Istirahat Pagi' },
    { jam_ke: 6, jam_mulai: '10:10', jam_selesai: '10:45', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: 7, jam_mulai: '10:45', jam_selesai: '11:20', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: 8, jam_mulai: '11:20', jam_selesai: '11:55', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: null, jam_mulai: '11:55', jam_selesai: '12:50', is_istirahat: true, keterangan: 'Istirahat Siang' },
    { jam_ke: 9, jam_mulai: '12:50', jam_selesai: '13:25', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: 10, jam_mulai: '13:25', jam_selesai: '14:00', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: 11, jam_mulai: '14:00', jam_selesai: '14:35', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: 12, jam_mulai: '14:35', jam_selesai: '15:10', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: null, jam_mulai: '15:10', jam_selesai: '15:50', is_istirahat: true, keterangan: 'Istirahat Sore' },
    { jam_ke: 13, jam_mulai: '15:50', jam_selesai: '16:25', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: 14, jam_mulai: '16:25', jam_selesai: '17:00', is_istirahat: false, keterangan: 'Pelajaran' },
  ];

  // Day Group B Template: Friday (17 slots)
  const groupBTemplate = [
    { jam_ke: 1, jam_mulai: '07:00', jam_selesai: '07:20', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: 2, jam_mulai: '07:20', jam_selesai: '07:50', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: 3, jam_mulai: '07:50', jam_selesai: '08:20', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: 4, jam_mulai: '08:20', jam_selesai: '08:50', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: 5, jam_mulai: '08:50', jam_selesai: '09:20', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: null, jam_mulai: '09:20', jam_selesai: '09:45', is_istirahat: true, keterangan: 'Istirahat Pagi' },
    { jam_ke: 6, jam_mulai: '09:45', jam_selesai: '10:15', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: 7, jam_mulai: '10:15', jam_selesai: '10:45', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: 8, jam_mulai: '10:45', jam_selesai: '11:20', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: null, jam_mulai: '11:20', jam_selesai: '12:50', is_istirahat: true, keterangan: 'Istirahat Siang (Shalat Jumat)' },
    { jam_ke: 9, jam_mulai: '12:50', jam_selesai: '13:25', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: 10, jam_mulai: '13:25', jam_selesai: '14:00', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: 11, jam_mulai: '14:00', jam_selesai: '14:35', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: 12, jam_mulai: '14:35', jam_selesai: '15:10', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: null, jam_mulai: '15:10', jam_selesai: '15:50', is_istirahat: true, keterangan: 'Istirahat Sore' },
    { jam_ke: 13, jam_mulai: '15:50', jam_selesai: '16:25', is_istirahat: false, keterangan: 'Pelajaran' },
    { jam_ke: 14, jam_mulai: '16:25', jam_selesai: '17:00', is_istirahat: false, keterangan: 'Pelajaran' },
  ];

  for (const day of days) {
    let template = [];
    if (day === 'Jumat') {
      template = groupBTemplate;
    } else if (day === 'Sabtu') {
      template = groupATemplate.slice(0, 9);
    } else {
      template = groupATemplate;
    }

    for (const item of template) {
      slotsData.push({
        hari: day,
        jam_ke: item.jam_ke,
        jam_mulai: item.jam_mulai,
        jam_selesai: item.jam_selesai,
        is_istirahat: item.is_istirahat,
        keterangan: item.keterangan,
        user_id: userId,
      });
    }
  }

  // Clear slots for this user first
  await prismaClient.slot.deleteMany({
    where: { user_id: userId }
  });

  await prismaClient.slot.createMany({
    data: slotsData,
  });

  return slotsData.length;
}

async function main() {
  // Seeder CLI runner: Find or create a default test user
  let testUser = await prisma.user.findFirst({
    where: { email: 'admin@sekolah.sch.id' }
  });

  if (!testUser) {
    // Creating dummy hashed password for test user
    // Note: using standard import of bcrypt is not done here to avoid seeding dependencies issues.
    testUser = await prisma.user.create({
      data: {
        email: 'admin@sekolah.sch.id',
        password: 'hashed_password_placeholder',
        nama_sekolah: 'SMA Negeri 1 Kita',
      }
    });
    console.log('Created default test user admin@sekolah.sch.id');
  }

  const count = await seedDefaultSlots(prisma, testUser.id);
  console.log(`Successfully seeded ${count} slots for user ID: ${testUser.id}!`);
}

// Running script directly
if (process.argv[1] && (process.argv[1].endsWith('seed.js') || process.argv[1].endsWith('seed'))) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
