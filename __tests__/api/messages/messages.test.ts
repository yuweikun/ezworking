import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/messages/route'
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

describe('/api/messages', () => {
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

  describe('GET /api/messages', () => {
    it('should return message history successfully', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          session_id: validSessionId,
          role: 'user',
          content: 'Hello',
          work_stage: 'greeting',
          timestamp: '2024-01-01T00:00:00Z',
        },
        {
          id: 'msg-2',
          session_id: validSessionId,
          role: 'ai',
          content: 'Hi there!',
          work_stage: 'response',
          timestamp: '2024-01-01T00:01:00Z',
        },
      ]

      // Mock session ownership verification
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: validSessionId, user_id: 'user-123' },
        error: null,
      })

      // Mock messages query
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: mockMessages,
        error: null,
      })

      const request = new NextRequest(`http://localhost:3000/api/messages?session_id=${validSessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.history).toHaveLength(2)
      expect(data.data.history[0].role).toBe('user')
      expect(data.data.history[0].content).toBe('Hello')
      expect(data.data.history[0].workflow_stage).toBe('greeting')
    })

    it('should return empty history for session with no messages', async () => {
      // Mock session ownership verification
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: validSessionId, user_id: 'user-123' },
        error: null,
      })

      // Mock empty messages query
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: [],
        error: null,
      })

      const request = new NextRequest(`http://localhost:3000/api/messages?session_id=${validSessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.history).toHaveLength(0)
      expect(data.data.hasMessages).toBe(false)
    })

    it('should return 400 for missing session_id', async () => {
      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for invalid session_id format', async () => {
      const request = new NextRequest('http://localhost:3000/api/messages?session_id=invalid-uuid', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('VALIDATION_ERROR')
    })

    it('should return 404 for non-existent session', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      })

      const request = new NextRequest(`http://localhost:3000/api/messages?session_id=${validSessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('SESSION_NOT_FOUND')
    })

    it('should return 403 for session not owned by user', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { id: validSessionId, user_id: 'other-user' },
        error: null,
      })

      const request = new NextRequest(`http://localhost:3000/api/messages?session_id=${validSessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('ACCESS_DENIED')
    })

    it('should return 401 for missing authentication', async () => {
      mockVerifyAuth.mockResolvedValue({ user: null, error: 'Unauthorized' })

      const request = new NextRequest(`http://localhost:3000/api/messages?session_id=${validSessionId}`, {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('UNAUTHORIZED')
    })
  })

  describe('POST /api/messages', () => {
    it('should create a new message successfully', async () => {
      // Mock session ownership verification
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: validSessionId, user_id: 'user-123' },
        error: null,
      })

      const newMessage = {
        id: 'msg-new',
        session_id: validSessionId,
        role: 'user',
        content: 'New message',
        work_stage: 'testing',
        timestamp: '2024-01-01T00:00:00Z',
      }

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: newMessage,
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          session_id: validSessionId,
          role: 'user',
          content: 'New message',
          work_stage: 'testing',
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
      expect(data.data.content).toBe('New message')
      expect(data.data.role).toBe('user')
    })

    it('should create message without work_stage', async () => {
      // Mock session ownership verification
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: validSessionId, user_id: 'user-123' },
        error: null,
      })

      const newMessage = {
        id: 'msg-new',
        session_id: validSessionId,
        role: 'ai',
        content: 'AI response',
        work_stage: null,
        timestamp: '2024-01-01T00:00:00Z',
      }

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: newMessage,
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          session_id: validSessionId,
          role: 'ai',
          content: 'AI response',
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
      expect(data.data.content).toBe('AI response')
      expect(data.data.role).toBe('ai')
    })

    it('should return 400 for missing session_id', async () => {
      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          role: 'user',
          content: 'Message without session',
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

    it('should return 400 for missing role', async () => {
      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          session_id: validSessionId,
          content: 'Message without role',
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

    it('should return 400 for missing content', async () => {
      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          session_id: validSessionId,
          role: 'user',
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

    it('should return 400 for invalid role', async () => {
      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          session_id: validSessionId,
          role: 'invalid_role',
          content: 'Message with invalid role',
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

    it('should return 400 for empty content', async () => {
      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          session_id: validSessionId,
          role: 'user',
          content: '   ',
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

    it('should return 400 for content too long', async () => {
      const longContent = 'a'.repeat(10001)

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          session_id: validSessionId,
          role: 'user',
          content: longContent,
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

    it('should return 403 for session not owned by user', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { id: validSessionId, user_id: 'other-user' },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          session_id: validSessionId,
          role: 'user',
          content: 'Message for other user session',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('ACCESS_DENIED')
    })

    it('should return 404 for non-existent session', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      })

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          session_id: validSessionId,
          role: 'user',
          content: 'Message for non-existent session',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('SESSION_NOT_FOUND')
    })

    it('should return 401 for missing authentication', async () => {
      mockVerifyAuth.mockResolvedValue({ user: null, error: 'Unauthorized' })

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          session_id: validSessionId,
          role: 'user',
          content: 'Unauthenticated message',
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
      const request = new NextRequest('http://localhost:3000/api/messages', {
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
  })

  describe('Unsupported methods', () => {
    it('should return 405 for PUT method', async () => {
      const request = new NextRequest('http://localhost:3000/api/messages', {
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