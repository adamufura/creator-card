require('dotenv').config();

process.env.USE_MOCK_MODEL = '1';

const { assert } = require('chai');
const { MockModelStubs } = require('@app/mock-models');
const createMockServer = require('@app-core/mock-server');

const cards = [];

function findMatchingCard(query) {
  return (
    cards.find((card) =>
      Object.keys(query).every((key) => {
        if (query[key] === null) {
          return card[key] === null || card[key] === undefined;
        }
        return card[key] === query[key];
      })
    ) || null
  );
}

function setupInMemoryStore() {
  MockModelStubs.CreatorCard.configureStubs({
    method: 'findOne',
    overrideFn: (config) => findMatchingCard(config.query || {}),
  });

  MockModelStubs.CreatorCard.configureStubs({
    method: 'create',
    overrideFn: (data) => {
      const now = Date.now();
      const card = {
        _id: `01TEST${String(cards.length + 1).padStart(22, '0')}`,
        links: [],
        access_type: 'public',
        access_code: null,
        deleted: null,
        created: now,
        updated: now,
        ...data,
      };
      cards.push(card);
      return card;
    },
  });

  MockModelStubs.CreatorCard.configureStubs({
    method: 'updateOne',
    overrideFn: (config) => {
      const card = findMatchingCard(config.query || {});
      if (!card) {
        return { acknowledged: true, modifiedCount: 0 };
      }

      Object.assign(card, config.updateValues, { updated: Date.now() });
      return { acknowledged: true, modifiedCount: 1 };
    },
  });
}

describe('Creator Cards API', () => {
  let server;

  before(() => {
    cards.length = 0;
    setupInMemoryStore();
    server = createMockServer(['endpoints/creator-cards']);
  });

  it('Test Case 1 - Full creation', async () => {
    const response = await server.post('/creator-cards', {
      body: {
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
      },
    });

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.data.status, 'success');
    assert.strictEqual(response.data.data.slug, 'george-cooks');
    assert.strictEqual(response.data.data.access_type, 'public');
    assert.property(response.data.data, 'id');
    assert.notProperty(response.data.data, '_id');
  });

  it('Test Case 2 - Slug auto-generation', async () => {
    const response = await server.post('/creator-cards', {
      body: {
        title: 'Ada Designs Things',
        creator_reference: 'crt_a1b2c3d4e5f6g7h8',
        status: 'published',
      },
    });

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.data.data.slug, 'ada-designs-things');
  });

  it('Test Case 3 - Private card creation', async () => {
    const response = await server.post('/creator-cards', {
      body: {
        title: 'VIP Rate Card',
        creator_reference: 'crt_x9y8z7w6v5u4t3s2',
        status: 'published',
        access_type: 'private',
        access_code: 'A1B2C3',
      },
    });

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.data.data.access_code, 'A1B2C3');
    assert.strictEqual(response.data.data.slug, 'vip-rate-card');
  });

  it('Test Case 4 - Retrieving a public published card', async () => {
    const response = await server.get('/creator-cards/george-cooks', {});

    assert.strictEqual(response.statusCode, 200);
    assert.property(response.data.data, 'id');
    assert.notProperty(response.data.data, 'access_code');
  });

  it('Test Case 5 - Retrieving a private card with correct pin', async () => {
    const response = await server.get('/creator-cards/vip-rate-card', {
      query: { access_code: 'A1B2C3' },
    });

    assert.strictEqual(response.statusCode, 200);
    assert.notProperty(response.data.data, 'access_code');
  });

  it('Test Case 6 - Deleting a card', async () => {
    const response = await server.delete('/creator-cards/ada-designs-things', {
      body: {
        creator_reference: 'crt_a1b2c3d4e5f6g7h8',
      },
    });

    assert.strictEqual(response.statusCode, 200);
    assert.isNumber(response.data.data.deleted);
  });

  it('Test Case 7 - Duplicate slug', async () => {
    const response = await server.post('/creator-cards', {
      body: {
        title: 'Another George',
        slug: 'george-cooks',
        creator_reference: 'crt_m1n2b3v4c5x6z7l8',
        status: 'published',
      },
    });

    assert.strictEqual(response.statusCode, 400);
    assert.strictEqual(response.data.code, 'SL02');
  });

  it('Test Case 8 - Missing access_code on private card', async () => {
    const response = await server.post('/creator-cards', {
      body: {
        title: 'Secret Card',
        creator_reference: 'crt_q1w2e3r4t5y6u7i8',
        status: 'published',
        access_type: 'private',
      },
    });

    assert.strictEqual(response.statusCode, 400);
    assert.strictEqual(response.data.code, 'AC01');
  });

  it('Test Case 9 - access_code on a public card', async () => {
    const response = await server.post('/creator-cards', {
      body: {
        title: 'Public Card',
        creator_reference: 'crt_q1w2e3r4t5y6u7i8',
        status: 'published',
        access_type: 'public',
        access_code: 'A1B2C3',
      },
    });

    assert.strictEqual(response.statusCode, 400);
    assert.strictEqual(response.data.code, 'AC05');
  });

  it('Test Case 10 - Framework validation failure', async () => {
    const response = await server.post('/creator-cards', {
      body: {
        title: 'Bad Status Card',
        creator_reference: 'crt_q1w2e3r4t5y6u7i8',
        status: 'archived',
      },
    });

    assert.strictEqual(response.statusCode, 400);
  });

  it('Test Case 11 - Retrieving a non-existent card', async () => {
    const response = await server.get('/creator-cards/does-not-exist-123', {});

    assert.strictEqual(response.statusCode, 404);
    assert.strictEqual(response.data.code, 'NF01');
  });

  it('Test Case 12 - Retrieving a draft card', async () => {
    await server.post('/creator-cards', {
      body: {
        title: 'My Draft Card',
        slug: 'my-draft-card',
        creator_reference: 'crt_d1r2a3f4t5c6a7r8',
        status: 'draft',
      },
    });

    const response = await server.get('/creator-cards/my-draft-card', {});

    assert.strictEqual(response.statusCode, 404);
    assert.strictEqual(response.data.code, 'NF02');
  });

  it('Test Case 13 - Retrieving a private card without a pin', async () => {
    const response = await server.get('/creator-cards/vip-rate-card', {});

    assert.strictEqual(response.statusCode, 403);
    assert.strictEqual(response.data.code, 'AC03');
  });

  it('Test Case 14 - Retrieving a private card with a wrong pin', async () => {
    const response = await server.get('/creator-cards/vip-rate-card', {
      query: { access_code: 'WRONG1' },
    });

    assert.strictEqual(response.statusCode, 403);
    assert.strictEqual(response.data.code, 'AC04');
  });

  it('Test Case 15 - Deleting a non-existent card', async () => {
    const response = await server.delete('/creator-cards/does-not-exist-123', {
      body: {
        creator_reference: 'crt_q1w2e3r4t5y6u7i8',
      },
    });

    assert.strictEqual(response.statusCode, 404);
    assert.strictEqual(response.data.code, 'NF01');
  });

  it('Test Case 16 - Retrieving a deleted card', async () => {
    const response = await server.get('/creator-cards/ada-designs-things', {});

    assert.strictEqual(response.statusCode, 404);
    assert.strictEqual(response.data.code, 'NF01');
  });
});
