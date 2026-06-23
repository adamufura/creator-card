/* eslint-disable no-console */
/**
 * Live integration tests against a running server.
 * Usage: node scripts/test-endpoints.js [baseUrl]
 * Default baseUrl: http://localhost:3000
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';

let passed = 0;
let failed = 0;

async function request(method, path, body) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);
  let data;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { status: response.status, data };
}

function assert(condition, testName, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${testName}`);
    return true;
  }

  failed += 1;
  console.log(`  FAIL  ${testName}${detail ? ` — ${detail}` : ''}`);
  return false;
}

async function runTests() {
  console.log(`\nTesting Creator Cards API at ${BASE_URL}\n`);

  // Test Case 1 - Full creation
  const tc1 = await request('POST', '/creator-cards', {
    title: 'George Cooks',
    description: 'Weekly cooking podcast',
    slug: 'george-cooks',
    creator_reference: 'crt_8f2k1m9x4p7w3q5z',
    links: [{ title: 'YouTube', url: 'https://youtube.com/@georgecooks' }],
    service_rates: {
      currency: 'NGN',
      rates: [{ name: 'IG Story Post', description: 'One story mention', amount: 5000000 }],
    },
    status: 'published',
  });
  assert(tc1.status === 200, 'Test 1: HTTP 200 on full creation');
  assert(tc1.data?.status === 'success', 'Test 1: status success');
  assert(tc1.data?.data?.slug === 'george-cooks', 'Test 1: slug george-cooks');
  assert(tc1.data?.data?.access_type === 'public', 'Test 1: access_type defaults to public');
  assert(tc1.data?.data?.id && !tc1.data?.data?._id, 'Test 1: exposes id not _id');

  // Test Case 2 - Slug auto-generation
  const tc2 = await request('POST', '/creator-cards', {
    title: 'Ada Designs Things',
    creator_reference: 'crt_a1b2c3d4e5f6g7h8',
    status: 'published',
  });
  assert(tc2.status === 200, 'Test 2: HTTP 200 on auto-slug creation');
  assert(tc2.data?.data?.slug === 'ada-designs-things', 'Test 2: slug ada-designs-things');

  // Test Case 3 - Private card creation
  const tc3 = await request('POST', '/creator-cards', {
    title: 'VIP Rate Card',
    creator_reference: 'crt_x9y8z7w6v5u4t3s2',
    status: 'published',
    access_type: 'private',
    access_code: 'A1B2C3',
  });
  assert(tc3.status === 200, 'Test 3: HTTP 200 on private card');
  assert(tc3.data?.data?.access_code === 'A1B2C3', 'Test 3: access_code returned');
  assert(tc3.data?.data?.slug === 'vip-rate-card', 'Test 3: slug vip-rate-card');

  // Test Case 4 - Retrieve public card
  const tc4 = await request('GET', '/creator-cards/george-cooks');
  assert(tc4.status === 200, 'Test 4: HTTP 200 on public retrieval');
  assert(tc4.data?.data?.id && !tc4.data?.data?._id, 'Test 4: id not _id');
  assert(tc4.data?.data?.access_code === undefined, 'Test 4: no access_code in response');

  // Test Case 5 - Retrieve private card with correct pin
  const tc5 = await request('GET', '/creator-cards/vip-rate-card?access_code=A1B2C3');
  assert(tc5.status === 200, 'Test 5: HTTP 200 with correct pin');
  assert(tc5.data?.data?.access_code === undefined, 'Test 5: no access_code in response');

  // Test Case 6 - Delete card
  const tc6 = await request('DELETE', '/creator-cards/ada-designs-things', {
    creator_reference: 'crt_a1b2c3d4e5f6g7h8',
  });
  assert(tc6.status === 200, 'Test 6: HTTP 200 on delete');
  assert(typeof tc6.data?.data?.deleted === 'number', 'Test 6: deleted timestamp set');

  // Test Case 7 - Duplicate slug
  const tc7 = await request('POST', '/creator-cards', {
    title: 'Another George',
    slug: 'george-cooks',
    creator_reference: 'crt_m1n2b3v4c5x6z7l8',
    status: 'published',
  });
  assert(tc7.status === 400, 'Test 7: HTTP 400 on duplicate slug');
  assert(tc7.data?.code === 'SL02', 'Test 7: error code SL02');

  // Test Case 8 - Missing access_code on private
  const tc8 = await request('POST', '/creator-cards', {
    title: 'Secret Card',
    creator_reference: 'crt_q1w2e3r4t5y6u7i8',
    status: 'published',
    access_type: 'private',
  });
  assert(tc8.status === 400, 'Test 8: HTTP 400 missing access_code');
  assert(tc8.data?.code === 'AC01', 'Test 8: error code AC01');

  // Test Case 9 - access_code on public card
  const tc9 = await request('POST', '/creator-cards', {
    title: 'Public Card',
    creator_reference: 'crt_q1w2e3r4t5y6u7i8',
    status: 'published',
    access_type: 'public',
    access_code: 'A1B2C3',
  });
  assert(tc9.status === 400, 'Test 9: HTTP 400 access_code on public');
  assert(tc9.data?.code === 'AC05', 'Test 9: error code AC05');

  // Test Case 10 - Framework validation failure
  const tc10 = await request('POST', '/creator-cards', {
    title: 'Bad Status Card',
    creator_reference: 'crt_q1w2e3r4t5y6u7i8',
    status: 'archived',
  });
  assert(tc10.status === 400, 'Test 10: HTTP 400 on invalid status');

  // Test Case 11 - Non-existent card
  const tc11 = await request('GET', '/creator-cards/does-not-exist-123');
  assert(tc11.status === 404, 'Test 11: HTTP 404 non-existent');
  assert(tc11.data?.code === 'NF01', 'Test 11: error code NF01');

  // Test Case 12 - Draft card (create then retrieve)
  await request('POST', '/creator-cards', {
    title: 'My Draft Card',
    slug: 'my-draft-card',
    creator_reference: 'crt_d1r2a3f4t5c6a7r8',
    status: 'draft',
  });
  const tc12 = await request('GET', '/creator-cards/my-draft-card');
  assert(tc12.status === 404, 'Test 12: HTTP 404 on draft');
  assert(tc12.data?.code === 'NF02', 'Test 12: error code NF02');

  // Test Case 13 - Private card without pin
  const tc13 = await request('GET', '/creator-cards/vip-rate-card');
  assert(tc13.status === 403, 'Test 13: HTTP 403 no pin');
  assert(tc13.data?.code === 'AC03', 'Test 13: error code AC03');

  // Test Case 14 - Wrong pin
  const tc14 = await request('GET', '/creator-cards/vip-rate-card?access_code=WRONG1');
  assert(tc14.status === 403, 'Test 14: HTTP 403 wrong pin');
  assert(tc14.data?.code === 'AC04', 'Test 14: error code AC04');

  // Test Case 15 - Delete non-existent
  const tc15 = await request('DELETE', '/creator-cards/does-not-exist-123', {
    creator_reference: 'crt_q1w2e3r4t5y6u7i8',
  });
  assert(tc15.status === 404, 'Test 15: HTTP 404 delete non-existent');
  assert(tc15.data?.code === 'NF01', 'Test 15: error code NF01');

  // Test Case 16 - Retrieve deleted card
  const tc16 = await request('GET', '/creator-cards/ada-designs-things');
  assert(tc16.status === 404, 'Test 16: HTTP 404 deleted card');
  assert(tc16.data?.code === 'NF01', 'Test 16: error code NF01');

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test run failed:', err.message);
  process.exit(1);
});
