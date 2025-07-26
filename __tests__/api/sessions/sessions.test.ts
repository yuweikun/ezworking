import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/sessions/route'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase
jest.mock('@supabase/supabase-js')
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

// Mock auth utility
jest.mock('@/lib/utils/auth', () => ({
  verifyAuth: jest.fn(),
}))

import { verifyAuth } from '@/lib/utils/auth'
const mockVerifyAuth = verifyAuth as jest.MockedFunction<typeof verifyAuth>

describe('/api/sessions', () => {
  let mockSupabase: any
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  }

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn(),
      })),
    }
    mockCreateClient.mockReturnValue(mockSupabase)
    mockVerifyAuth.mockResolvedValue({ user: mockUser, error: null })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/sessions', () => {
    it('should return user sessions successfully', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          user_id: 'user-123',
          title: 'Test Session 1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'session-2',
          user_id: 'user-123',
          title: 'Test Session 2',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ]

      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: mockSessions,
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      expect(data.data[0].title).toBe('Test Session 1')
      expect(mockSupabase.from).toHaveBeenCalledWith('chat_sessions')
    })

    it('should return empty array when user has no sessions', async () => {
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: [],
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(0)
    })

    it('should return 401 for missing authentication', async () => {
      mockVerifyAuth.mockResolvedValue({ user: null, error: 'Unauthorized' })

      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('UNAUTHORIZED')
    })

    it('should handle database errors', async () => {
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: null,
        error: { code: '08006', message: 'Connection failed' },
      })

      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toBe('SERVICE_UNAVAILABLE')
    })
  })

  describe('POST /api/sessions', () => {
    it('should create a new session successfully', async () => {
      const newSession = {
        id: 'session-new',
        user_id: 'user-123',
        title: 'New Session',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: newSession,
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Session',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.title).toBe('New Session')
      expect(data.data.user_id).toBe('user-123')
    })

    it('should return 400 for missing title', async () => {
      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for empty title', async () => {
      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          title: '   ',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for title too long', async () => {
      const longTitle = 'a'.repeat(201)

      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          title: longTitle,
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('VALIDATION_ERROR')
    })

    it('should return 401 for missing authentication', async () => {
      mockVerifyAuth.mockResolvedValue({ user: null, error: 'Unauthorized' })

      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Session',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('UNAUTHORIZED')
    })

    it('should return 400 for invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('INVALID_JSON')
    })

    it('should handle database errors during creation', async () => {
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'Duplicate key' },
      })

      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Session',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('DUPLICATE_ENTRY')
    })
  })

  describe('Unsupported methods', () => {
    it('should return 405 for PUT method', async () => {
      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'PUT',
      })

      // Since we don't have a PUT handler, we'll test with POST handler
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(405)
      expect(data.error).toBe('METHOD_NOT_ALLOWED')
    })
  })
})