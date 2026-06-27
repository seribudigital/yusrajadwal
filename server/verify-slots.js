import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  const allSlots = await prisma.slot.findMany({
    orderBy: [
      { id: 'asc' }
    ]
  });

  console.log('--- VERIFICATION SUMMARY ---');
  console.log(`Total slots found in DB: ${allSlots.length}`);

  // Group slots by user_id
  const slotsByUser = {};
  for (const slot of allSlots) {
    if (!slotsByUser[slot.user_id]) {
      slotsByUser[slot.user_id] = [];
    }
    slotsByUser[slot.user_id].push(slot);
  }

  const userIds = Object.keys(slotsByUser);
  console.log(`Found data for ${userIds.length} users.`);

  for (const userId of userIds) {
    const userSlots = slotsByUser[userId];
    console.log(`\nChecking User ID: ${userId} (Slots Count: ${userSlots.length})`);

    if (userSlots.length === 94) {
      console.log(`✅ PASS: Total slots count matches exactly 94 for User ${userId}.`);
    } else {
      console.log(`❌ FAIL: Total slots count is ${userSlots.length}, expected 94 for User ${userId}.`);
    }

    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const expectedCounts = {
      Senin: 17,
      Selasa: 17,
      Rabu: 17,
      Kamis: 17,
      Jumat: 17,
      Sabtu: 9
    };

    let allDaysMatch = true;
    for (const day of days) {
      const count = userSlots.filter(s => s.hari === day).length;
      const expected = expectedCounts[day];
      console.log(`  Day: ${day} - Count: ${count} (Expected: ${expected})`);
      if (count !== expected) {
        allDaysMatch = false;
      }
    }

    if (allDaysMatch) {
      console.log(`✅ PASS: All days have correct slot counts for User ${userId}.`);
    } else {
      console.log(`❌ FAIL: Some days have incorrect slot counts for User ${userId}.`);
    }

    // Verify Friday lunchtime slot details (Shalat Jumat)
    const fridayLunch = userSlots.find(s => s.hari === 'Jumat' && s.is_istirahat && s.keterangan.includes('Shalat Jumat'));
    if (fridayLunch) {
      console.log(`  Friday Lunch Break: ${fridayLunch.jam_mulai} - ${fridayLunch.jam_selesai} (${fridayLunch.keterangan})`);
      if (fridayLunch.jam_mulai === '11:20' && fridayLunch.jam_selesai === '12:50') {
        console.log(`✅ PASS: Friday lunch/prayer break times are correct (11:20 - 12:50) for User ${userId}.`);
      } else {
        console.log(`❌ FAIL: Friday lunch/prayer break times do not match (11:20 - 12:50) for User ${userId}.`);
      }
    } else {
      console.log(`❌ FAIL: Friday lunch/prayer break not found for User ${userId}.`);
    }

    // Verify Monday lunchtime slot details
    const mondayLunch = userSlots.find(s => s.hari === 'Senin' && s.is_istirahat && s.keterangan === 'Istirahat Siang');
    if (mondayLunch) {
      console.log(`  Monday Lunch Break: ${mondayLunch.jam_mulai} - ${mondayLunch.jam_selesai} (${mondayLunch.keterangan})`);
      if (mondayLunch.jam_mulai === '11:55' && mondayLunch.jam_selesai === '12:50') {
        console.log(`✅ PASS: Monday lunch break times are correct (11:55 - 12:50) for User ${userId}.`);
      } else {
        console.log(`❌ FAIL: Monday lunch break times do not match (11:55 - 12:50) for User ${userId}.`);
      }
    } else {
      console.log(`❌ FAIL: Monday lunch break not found for User ${userId}.`);
    }

    // Verify Saturday slots details
    const saturdayPelajaranCount = userSlots.filter(s => s.hari === 'Sabtu' && !s.is_istirahat).length;
    const saturdayBreakCount = userSlots.filter(s => s.hari === 'Sabtu' && s.is_istirahat).length;
    console.log(`  Saturday Pelajaran: ${saturdayPelajaranCount}, Breaks: ${saturdayBreakCount}`);
    if (saturdayPelajaranCount === 8 && saturdayBreakCount === 1) {
      console.log(`✅ PASS: Saturday has exactly 8 lesson periods and 1 break for User ${userId}.`);
    } else {
      console.log(`❌ FAIL: Saturday structure does not match (expected 8 lessons and 1 break) for User ${userId}.`);
    }
  }

  console.log('----------------------------');
}

verify()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
