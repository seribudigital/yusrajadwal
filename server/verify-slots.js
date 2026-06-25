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
  if (allSlots.length === 94) {
    console.log('✅ PASS: Total slots count matches exactly 94.');
  } else {
    console.log(`❌ FAIL: Total slots count is ${allSlots.length}, expected 94.`);
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
    const count = allSlots.filter(s => s.hari === day).length;
    const expected = expectedCounts[day];
    console.log(`Day: ${day} - Count: ${count} (Expected: ${expected})`);
    if (count !== expected) {
      allDaysMatch = false;
    }
  }

  if (allDaysMatch) {
    console.log('✅ PASS: All days have the correct number of slots.');
  } else {
    console.log('❌ FAIL: Some days have incorrect slot counts.');
  }

  // Verify Friday lunchtime slot details
  const fridayLunch = allSlots.find(s => s.hari === 'Jumat' && s.is_istirahat && s.keterangan.includes('Shalat Jumat'));
  if (fridayLunch) {
    console.log(`Friday Lunch Break: ${fridayLunch.jam_mulai} - ${fridayLunch.jam_selesai} (${fridayLunch.keterangan})`);
    if (fridayLunch.jam_mulai === '12:00' && fridayLunch.jam_selesai === '13:15') {
      console.log('✅ PASS: Friday lunch/prayer break times are correct (12:00 - 13:15).');
    } else {
      console.log('❌ FAIL: Friday lunch/prayer break times do not match.');
    }
  } else {
    console.log('❌ FAIL: Friday lunch/prayer break not found.');
  }

  // Verify Monday lunchtime slot details
  const mondayLunch = allSlots.find(s => s.hari === 'Senin' && s.is_istirahat && s.keterangan === 'Istirahat Siang');
  if (mondayLunch) {
    console.log(`Monday Lunch Break: ${mondayLunch.jam_mulai} - ${mondayLunch.jam_selesai} (${mondayLunch.keterangan})`);
    if (mondayLunch.jam_mulai === '12:40' && mondayLunch.jam_selesai === '13:10') {
      console.log('✅ PASS: Monday lunch break times are correct (12:40 - 13:10).');
    } else {
      console.log('❌ FAIL: Monday lunch break times do not match.');
    }
  } else {
    console.log('❌ FAIL: Monday lunch break not found.');
  }

  // Verify Saturday slots details
  const saturdayPelajaranCount = allSlots.filter(s => s.hari === 'Sabtu' && !s.is_istirahat).length;
  const saturdayBreakCount = allSlots.filter(s => s.hari === 'Sabtu' && s.is_istirahat).length;
  console.log(`Saturday Pelajaran: ${saturdayPelajaranCount}, Breaks: ${saturdayBreakCount}`);
  if (saturdayPelajaranCount === 8 && saturdayBreakCount === 1) {
    console.log('✅ PASS: Saturday has exactly 8 lesson periods and 1 break.');
  } else {
    console.log('❌ FAIL: Saturday structure does not match.');
  }

  console.log('----------------------------');
}

verify()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
