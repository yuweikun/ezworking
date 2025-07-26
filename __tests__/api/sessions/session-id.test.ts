import { NextRequest } from 'next/server'
import { POST } from '@/app/api/sessions/[id]/route'
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

describe('/api/sessions/[id]', () => {
  let mockSupabase: any
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  }
  const validSessionId = '550e8400-e29b-41d4-a716-446655440001'

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
      })),
    }
    mockCreateClient.mockReturnValue(mockSupabase)
    mockVerifyAuth.mockResolvedValue({ user: mockUser, error: null })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/sessions/[id] - Delete Session', () => {
    it('should delete session successfully', async () => {
      // Mock session exists and belongs to user
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: validSessionId,
          user_id: 'user-123',
          title: 'Test Session',
        },
        error: null,
      })

      // Mock successful deletion
      mockSupabase.from().delete().eq.mockResolvedValue({
        data: null,
        error: null,
      })

      const request = new NextRequest(`http://localhost:3000/api/sessions/${validSessionId}`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await POST(request, { params: { id: validSessionId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('删除成功')
    })

    it('should return 400 for invalid session ID format', async () => {
      const invalidId = 'invalid-uuid'

      const request = new NextRequest(`http://localhost:3000/api/sessions/${invalidId}`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await POST(request, { params: { id: invalidId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('INVALID_SESSION_ID')
    })

    it('should return 404 for non-existent session', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      })

      const request = new NextRequest(`http://localhost:3000/api/sessions/${validSessionId}`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await POST(request, { params: { id: validSessionId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('SESSION_NOT_FOUND')
    })

    it('should return 403 for session not owned by user', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: validSessionId,
          user_id: 'other-user',
          title: 'Other User Session',
        },
        error: null,
      })

      const request = new NextRequest(`http://localhost:3000/api/sessions/${validSessionId}`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await POST(request, { params: { id: validSessionId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('ACCESS_DENIED')
    })
  })

  describe('POST /api/sessions/[id] - Update Session', () => {
    it('should update session title successfully', async () => {
      // Mock session exists and belongs to user
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: validSessionId,
          user_id: 'user-123',
          title: 'Old Title',
        },
        error: null,
      })

      // Mock successful update
      const updatedSession = {
        id: validSessionId,
        user_id: 'user-123',
        title: 'New Title',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedSession,
        error: null,
      })

      const request = new NextRequest(`http://localhost:3000/api/sessions/${validSessionId}`, {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Title',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await POST(request, { params: { id: validSessionId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.title).toBe('New Title')
    })

    it('should return 400 for empty title', async () => {
      const request = new NextRequest(`http://localhost:3000/api/sessions/${validSessionId}`, {
        method: 'POST',
        body: JSON.stringify({
          title: '   ',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await POST(request, { params: { id: validSessionId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for title too long', async () => {
      const longTitle = 'a'.repeat(201)

      const request = new NextRequest(`http://localhost:3000/api/sessions/${validSessionId}`, {
        method: 'POST',
        body: JSON.stringify({
          title: longTitle,
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await POST(request, { params: { id: validSessionId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for no valid fields to update', async () => {
      const request = new NextRequest(`http://localhost:3000/api/sessions/${validSessionId}`, {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await POST(request, { params: { id: validSessionId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('VALIDATION_ERROR')
    })
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing authentication', async () => {
      mockVerifyAuth.mockResolvedValue({ user: null, error: 'Unauthorized' })

      const request = new NextRequest(`http://localhost:3000/api/sessions/${validSessionId}`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: { id: validSessionId } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('UNAUTHORIZED')
    })

    it('should return 400 for invalid JSON', async () => {
      const request = new NextRequest(`http://localhost:3000/api/sessions/${validSessionId}`, {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await POST(request, { params: { id: validSessionId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('INVALID_JSON')
    })
  })

  describe('Database Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: '08006', message: 'Connection failed' },
      })

      const request = new NextRequest(`http://localhost:3000/api/sessions/${validSessionId}`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await POST(request, { params: { id: validSessionId } })
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toBe('SERVICE_UNAVAILABLE')
    })

    it('should handle RLS policy violations', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'RLS policy violation' },
      })

      const request = new NextRequest(`http://localhost:3000/api/sessions/${validSessionId}`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await POST(request, { params: { id: validSessionId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('ACCESS_DENIED')
    })
  })
})