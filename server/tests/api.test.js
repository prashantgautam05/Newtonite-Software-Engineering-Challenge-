const request = require('supertest');
const { app } = require('../src/app');

describe('Newtonian API Integration Tests', () => {
  let token;
  let workItemId;
  let teamId;

  describe('Health Check', () => {
    it('GET /api/health should return ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'ok');
    });
  });

  describe('Authentication API', () => {
    it('POST /api/auth/login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@newtonite.com', password: 'password123' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('email', 'alice@newtonite.com');
      token = res.body.token;
    });

    it('POST /api/auth/login with invalid credentials should return 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@newtonite.com', password: 'wrongpassword' });

      expect(res.statusCode).toEqual(401);
    });

    it('GET /api/auth/profile with token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('email', 'alice@newtonite.com');
    });
  });

  describe('Teams API', () => {
    it('GET /api/teams should list seeded teams', async () => {
      const res = await request(app)
        .get('/api/teams')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      teamId = res.body[0].id;
    });
  });

  describe('Work Items API & Concurrency Control', () => {
    it('GET /api/work-items should return list with pagination metadata', async () => {
      const res = await request(app)
        .get('/api/work-items')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('POST /api/work-items creates a new item with idempotency key', async () => {
      const res = await request(app)
        .post('/api/work-items')
        .set('Authorization', `Bearer ${token}`)
        .set('x-idempotency-key', 'test-key-12345')
        .send({
          title: 'Test Integration Work Item',
          description: 'Created via automated jest tests',
          priority: 'HIGH',
          category: 'OPERATIONAL',
          teamId: teamId
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Test Integration Work Item');
      expect(res.body.version).toBe(1);
      expect(res.body.status).toBe('OPEN');
      workItemId = res.body.id;
    });

    it('PUT /api/work-items/:id updates item and increments version', async () => {
      const res = await request(app)
        .put(`/api/work-items/${workItemId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Test Title',
          version: 1
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.title).toBe('Updated Test Title');
      expect(res.body.version).toBe(2);
    });

    it('PUT /api/work-items/:id with outdated version returns 409 Conflict', async () => {
      const res = await request(app)
        .put(`/api/work-items/${workItemId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Conflicting Edit Attempt',
          version: 1 // Actual version is now 2!
        });

      expect(res.statusCode).toEqual(409);
      expect(res.body).toHaveProperty('error');
    });

    it('PUT /api/work-items/:id transitions status to IN_PROGRESS', async () => {
      const res = await request(app)
        .put(`/api/work-items/${workItemId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'IN_PROGRESS',
          version: 2
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('IN_PROGRESS');
      expect(res.body.version).toBe(3);
    });
  });

  describe('Comments API', () => {
    it('POST /api/work-items/:id/comments adds a comment', async () => {
      const res = await request(app)
        .post(`/api/work-items/${workItemId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Test comment from jest test' });

      expect(res.statusCode).toEqual(201);
      expect(res.body.content).toBe('Test comment from jest test');
    });
  });
});
