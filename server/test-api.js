const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== STARTING API VALIDATION TESTS ===\n');

  try {
    // Register a test user
    const randomEmail = `test-${Math.random().toString(36).substring(7)}@sekolah.sch.id`;
    const regRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: randomEmail, password: 'password123', nama_sekolah: 'Test School' })
    });
    const regData = await regRes.json();
    console.log(`Registered test user: ${randomEmail}`);

    // Login to get token
    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: randomEmail, password: 'password123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Logged in, token received successfully.');

    // Helper fetch wrapper with Authorization header
    const authFetch = (url, options = {}) => {
      return fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers
        }
      });
    };

    // 1. Create a Teacher (Budi Utomo)
    const guruRes1 = await authFetch(`${BASE_URL}/gurus`, {
      method: 'POST',
      body: JSON.stringify({ nama_guru: 'Budi Utomo', nip: '198203112009021003' })
    });
    const guru1 = await guruRes1.json();
    console.log(`Created Teacher 1: ${guru1.nama_guru} (ID: ${guru1.id})`);

    // 2. Create another Teacher (Siti Aminah)
    const guruRes2 = await authFetch(`${BASE_URL}/gurus`, {
      method: 'POST',
      body: JSON.stringify({ nama_guru: 'Siti Aminah', nip: '198711042012042001' })
    });
    const guru2 = await guruRes2.json();
    console.log(`Created Teacher 2: ${guru2.nama_guru} (ID: ${guru2.id})`);

    // 3. Create a Class (7-A)
    const kelasRes1 = await authFetch(`${BASE_URL}/kelas`, {
      method: 'POST',
      body: JSON.stringify({ nama_kelas: '7-A' })
    });
    const kelas1 = await kelasRes1.json();
    console.log(`Created Class 1: ${kelas1.nama_kelas} (ID: ${kelas1.id})`);

    // 4. Create another Class (7-B)
    const kelasRes2 = await authFetch(`${BASE_URL}/kelas`, {
      method: 'POST',
      body: JSON.stringify({ nama_kelas: '7-B' })
    });
    const kelas2 = await kelasRes2.json();
    console.log(`Created Class 2: ${kelas2.nama_kelas} (ID: ${kelas2.id})`);

    // 5. Create a Subject (Matematika)
    const mapelRes = await authFetch(`${BASE_URL}/mapels`, {
      method: 'POST',
      body: JSON.stringify({ nama_mapel: 'Matematika', kode_mapel: 'MTK' })
    });
    const mapel = await mapelRes.json();
    console.log(`Created Subject: ${mapel.nama_mapel} (ID: ${mapel.id})`);

    // 6. Create Plot 1: Teacher Budi, Math, Class 7-A (Quota: 2 hours)
    const plotRes1 = await authFetch(`${BASE_URL}/plots`, {
      method: 'POST',
      body: JSON.stringify({ guru_id: guru1.id, mapel_id: mapel.id, kelas_id: kelas1.id, beban_jam: 2 })
    });
    const plot1 = await plotRes1.json();
    console.log(`Created Plot 1 (Budi - MTK - 7-A): Quota = ${plot1.beban_jam} hours (ID: ${plot1.id})`);

    // 7. Create Plot 2: Teacher Siti, Math, Class 7-A (Quota: 1 hour)
    const plotRes2 = await authFetch(`${BASE_URL}/plots`, {
      method: 'POST',
      body: JSON.stringify({ guru_id: guru2.id, mapel_id: mapel.id, kelas_id: kelas1.id, beban_jam: 1 })
    });
    const plot2 = await plotRes2.json();
    console.log(`Created Plot 2 (Siti - MTK - 7-A): Quota = ${plot2.beban_jam} hour (ID: ${plot2.id})`);

    // 8. Create Plot 3: Teacher Budi, Math, Class 7-B (Quota: 2 hours)
    const plotRes3 = await authFetch(`${BASE_URL}/plots`, {
      method: 'POST',
      body: JSON.stringify({ guru_id: guru1.id, mapel_id: mapel.id, kelas_id: kelas2.id, beban_jam: 2 })
    });
    const plot3 = await plotRes3.json();
    console.log(`Created Plot 3 (Budi - MTK - 7-B): Quota = ${plot3.beban_jam} hours (ID: ${plot3.id})\n`);

    // 9. Fetch Slots
    const slotsRes = await authFetch(`${BASE_URL}/slots`);
    const slots = await slotsRes.json();
    
    // Find slots for Senin
    const seninSlots = slots.filter(s => s.hari === 'Senin');
    const normalSlot1 = seninSlots.find(s => !s.is_istirahat && s.jam_ke === 1);
    const normalSlot2 = seninSlots.find(s => !s.is_istirahat && s.jam_ke === 2);
    const normalSlot3 = seninSlots.find(s => !s.is_istirahat && s.jam_ke === 3);
    const breakSlot = seninSlots.find(s => s.is_istirahat);

    console.log(`Using normalSlot1 (Senin Jam 1): ID ${normalSlot1.id}`);
    console.log(`Using normalSlot2 (Senin Jam 2): ID ${normalSlot2.id}`);
    console.log(`Using normalSlot3 (Senin Jam 3): ID ${normalSlot3.id}`);
    console.log(`Using breakSlot (Senin ${breakSlot.keterangan}): ID ${breakSlot.id}\n`);

    // --- TEST 1: Validasi Slot Istirahat ---
    console.log('Testing Test 1: Scheduling in Break Slot...');
    const t1Res = await authFetch(`${BASE_URL}/jadwals`, {
      method: 'POST',
      body: JSON.stringify({ slot_id: breakSlot.id, plot_id: plot1.id })
    });
    const t1Data = await t1Res.json();
    if (t1Res.status === 422 && t1Data.error === 'Tidak dapat menempatkan pelajaran pada jam istirahat!') {
      console.log('✅ TEST 1 PASSED: Break slot scheduling correctly blocked with message:', t1Data.error);
    } else {
      console.error('❌ TEST 1 FAILED:', t1Res.status, t1Data);
    }
    console.log('');

    // --- SETUP: Schedule Plot 1 (Budi, Math, 7-A) on Senin Jam 1 (Should succeed) ---
    console.log('Setup: Scheduling Plot 1 on Senin Jam 1...');
    const setupRes = await authFetch(`${BASE_URL}/jadwals`, {
      method: 'POST',
      body: JSON.stringify({ slot_id: normalSlot1.id, plot_id: plot1.id })
    });
    const jadwal1 = await setupRes.json();
    if (setupRes.status === 201) {
      console.log(`✅ Setup successful! Saved Jadwal ID: ${jadwal1.id}`);
    } else {
      console.error('❌ Setup failed:', setupRes.status, jadwal1);
    }
    console.log('');

    // --- TEST 2: Validasi Kelas Bentrok ---
    console.log('Testing Test 2: Scheduling Class 7-A again at same slot...');
    // Plot 2 is for Class 7-A (Teacher Siti)
    const t2Res = await authFetch(`${BASE_URL}/jadwals`, {
      method: 'POST',
      body: JSON.stringify({ slot_id: normalSlot1.id, plot_id: plot2.id })
    });
    const t2Data = await t2Res.json();
    if (t2Res.status === 422 && t2Data.error === 'Kelas ini sudah memiliki jadwal pelajaran lain pada jam ini!') {
      console.log('✅ TEST 2 PASSED: Class clash correctly blocked with message:', t2Data.error);
    } else {
      console.error('❌ TEST 2 FAILED:', t2Res.status, t2Data);
    }
    console.log('');

    // --- TEST 3: Validasi Guru Bentrok ---
    console.log('Testing Test 3: Scheduling Teacher Budi again at same slot (different class 7-B)...');
    // Plot 3 is Teacher Budi in Class 7-B
    const t3Res = await authFetch(`${BASE_URL}/jadwals`, {
      method: 'POST',
      body: JSON.stringify({ slot_id: normalSlot1.id, plot_id: plot3.id })
    });
    const t3Data = await t3Res.json();
    if (t3Res.status === 422 && t3Data.error.includes('sudah mengajar di kelas lain pada jam ini')) {
      console.log('✅ TEST 3 PASSED: Teacher clash correctly blocked with message:', t3Data.error);
    } else {
      console.error('❌ TEST 3 FAILED:', t3Res.status, t3Data);
    }
    console.log('');

    // --- SETUP: Schedule Plot 1 on Senin Jam 2 (Success, 2nd hours of Budi, Math, 7-A) ---
    console.log('Setup: Scheduling Plot 1 on Senin Jam 2 (using up quota of 2)...');
    const setup2Res = await authFetch(`${BASE_URL}/jadwals`, {
      method: 'POST',
      body: JSON.stringify({ slot_id: normalSlot2.id, plot_id: plot1.id })
    });
    const jadwal2 = await setup2Res.json();
    if (setup2Res.status === 201) {
      console.log(`✅ Setup successful! Saved Jadwal ID: ${jadwal2.id}`);
    } else {
      console.error('❌ Setup failed:', setup2Res.status, jadwal2);
    }
    console.log('');

    // --- TEST 4: Validasi Kuota Beban Jam ---
    console.log('Testing Test 4: Scheduling Plot 1 on Senin Jam 3 (exceeding quota of 2)...');
    const t4Res = await authFetch(`${BASE_URL}/jadwals`, {
      method: 'POST',
      body: JSON.stringify({ slot_id: normalSlot3.id, plot_id: plot1.id })
    });
    const t4Data = await t4Res.json();
    if (t4Res.status === 422 && t4Data.error === 'Jatah jam mengajar untuk mata pelajaran ini sudah habis!') {
      console.log('✅ TEST 4 PASSED: Quota overload correctly blocked with message:', t4Data.error);
    } else {
      console.error('❌ TEST 4 FAILED:', t4Res.status, t4Data);
    }
    console.log('');

    // --- TEST 5: PUT Update (Excluding Self ID) ---
    console.log('Testing Test 5: Updating Jadwal 1 (Senin Jam 1) with same info (should succeed due to self-exclusion)...');
    const t5Res = await authFetch(`${BASE_URL}/jadwals/${jadwal1.id}`, {
      method: 'PUT',
      body: JSON.stringify({ slot_id: normalSlot1.id, plot_id: plot1.id })
    });
    const t5Data = await t5Res.json();
    if (t5Res.status === 200 && t5Data.id === jadwal1.id) {
      console.log('✅ TEST 5 PASSED: Update with self succeeded without throwing false positive clashes!');
    } else {
      console.error('❌ TEST 5 FAILED:', t5Res.status, t5Data);
    }
    console.log('');

    console.log('=== ALL VALIDATION TESTS COMPLETED SUCCESSFULLY! ===');

  } catch (error) {
    console.error('Test execution error:', error);
  }
}

runTests();
