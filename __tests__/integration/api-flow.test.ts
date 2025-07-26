import { NextRequest } from 'next/server'
import { POST as registerPOST } from '@/app/api/auth/register/route'
import { POST as loginPOST } from '@/app/api/auth/login/route'
import { GET as sessionsGET, POST as sessionsPOST } from '@/app/api/sessions/route'
import { POST as sessionUpdatePOST } from '@/app/api/sessions/[id]/route'
import { GET as messagesGET, POST as messagesPOST } from '@/app/api/messages/route'
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

describe('API Integration Flow', () => {
  let mockSupabase: any
  const testUser = {
    id: 'user-123',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
  }
  const testSession = {
    access_token: 'token-123',
    refresh_token: 'refresh-123',
  }
  const sessionId = '550e8400-e29b-41d4-a716-446655440001'

  beforeEach(() => {
    mockSupabase = {
      auth: {
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn(),
      })),
    }
    mockCreateClient.mockReturnValue(mockSupabase)
    mockVerifyAuth.mockResolvedValue({ user: testUser, error: null })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Complete User Journey', () => {
    it('should handle complete user registration and chat flow', async () => {
      // Step 1: User Registration
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: testUser, session: testSession },
        error: null,
      })

      const registerRequest = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const registerResponse = await registerPOST(registerRequest)
      const registerData = await registerResponse.json()

      expect(registerResponse.status).toBe(201)
      expect(registerData.success).toBe(true)
      expect(registerData.data.user.email).toBe('test@example.com')

      // Step 2: User Login
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: testUser, session: testSession },
        error: null,
      })

      const loginRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const loginResponse = await loginPOST(loginRequest)
      const loginData = await loginResponse.json()

      expect(loginResponse.status).toBe(200)
      expect(loginData.success).toBe(true)
      expect(loginData.data.session.access_token).toBe('token-123')

      // Step 3: Get User Sessions (initially empty)
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: [],
        error: null,
      })

      const getSessionsRequest = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer token-123' },
      })

      const getSessionsResponse = await sessionsGET(getSessionsRequest)
      const getSessionsData = await getSessionsResponse.json()

      expect(getSessionsResponse.status).toBe(200)
      expect(getSessionsData.success).toBe(true)
      expect(getSessionsData.data).toHaveLength(0)

      // Step 4: Create New Session
      const newSession = {
        id: sessionId,
        user_id: 'user-123',
        title: 'My First Chat',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: newSession,
        error: null,
      })

      const createSessionRequest = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ title: 'My First Chat' }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const createSessionResponse = await sessionsPOST(createSessionRequest)
      const createSessionData = await createSessionResponse.json()

      expect(createSessionResponse.status).toBe(201)
      expect(createSessionData.success).toBe(true)
      expect(createSessionData.data.title).toBe('My First Chat')

      // Step 5: Get Messages (initially empty)
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: sessionId, user_id: 'user-123' },
        error: null,
      })

      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: [],
        error: null,
      })

      const getMessagesRequest = new NextRequest(`http://localhost:3000/api/messages?session_id=${sessionId}`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer token-123' },
      })

      const getMessagesResponse = await messagesGET(getMessagesRequest)
      const getMessagesData = await getMessagesResponse.json()

      expect(getMessagesResponse.status).toBe(200)
      expect(getMessagesData.success).toBe(true)
      expect(getMessagesData.data.history).toHaveLength(0)

      // Step 6: Add First Message
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: sessionId, user_id: 'user-123' },
        error: null,
      })

      const firstMessage = {
        id: 'msg-1',
        session_id: sessionId,
        role: 'user',
        content: 'Hello, AI!',
        work_stage: 'greeting',
        timestamp: '2024-01-01T00:00:00Z',
      }

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: firstMessage,
        error: null,
      })

      const createMessageRequest = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId,
          role: 'user',
          content: 'Hello, AI!',
          work_stage: 'greeting',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const createMessageResponse = await messagesPOST(createMessageRequest)
      const createMessageData = await createMessageResponse.json()

      expect(createMessageResponse.status).toBe(201)
      expect(createMessageData.success).toBe(true)
      expect(createMessageData.data.content).toBe('Hello, AI!')

      // Step 7: Add AI Response
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: sessionId, user_id: 'user-123' },
        error: null,
      })

      const aiMessage = {
        id: 'msg-2',
        session_id: sessionId,
        role: 'ai',
        content: 'Hello! How can I help you today?',
        work_stage: 'response',
        timestamp: '2024-01-01T00:01:00Z',
      }

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: aiMessage,
        error: null,
      })

      const createAIMessageRequest = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId,
          role: 'ai',
          content: 'Hello! How can I help you today?',
          work_stage: 'response',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const createAIMessageResponse = await messagesPOST(createAIMessageRequest)
      const createAIMessageData = await createAIMessageResponse.json()

      expect(createAIMessageResponse.status).toBe(201)
      expect(createAIMessageData.success).toBe(true)
      expect(createAIMessageData.data.role).toBe('ai')

      // Step 8: Get Updated Message History
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: sessionId, user_id: 'user-123' },
        error: null,
      })

      const messages = [firstMessage, aiMessage]
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: messages,
        error: null,
      })

      const getUpdatedMessagesRequest = new NextRequest(`http://localhost:3000/api/messages?session_id=${sessionId}`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer token-123' },
      })

      const getUpdatedMessagesResponse = await messagesGET(getUpdatedMessagesRequest)
      const getUpdatedMessagesData = await getUpdatedMessagesResponse.json()

      expect(getUpdatedMessagesResponse.status).toBe(200)
      expect(getUpdatedMessagesData.success).toBe(true)
      expect(getUpdatedMessagesData.data.history).toHaveLength(2)
      expect(getUpdatedMessagesData.data.history[0].role).toBe('user')
      expect(getUpdatedMessagesData.data.history[1].role).toBe('ai')

      // Step 9: Update Session Title
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: sessionId, user_id: 'user-123', title: 'My First Chat' },
        error: null,
      })

      const updatedSession = {
        ...newSession,
        title: 'Updated Chat Title',
        updated_at: '2024-01-01T01:00:00Z',
      }

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedSession,
        error: null,
      })

      const updateSessionRequest = new NextRequest(`http://localhost:3000/api/sessions/${sessionId}`, {
        method: 'POST',
        body: JSON.stringify({ title: 'Updated Chat Title' }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const updateSessionResponse = await sessionUpdatePOST(updateSessionRequest, { params: { id: sessionId } })
      const updateSessionData = await updateSessionResponse.json()

      expect(updateSessionResponse.status).toBe(200)
      expect(updateSessionData.success).toBe(true)
      expect(updateSessionData.data.title).toBe('Updated Chat Title')

      // Step 10: Get Updated Sessions List
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: [updatedSession],
        error: null,
      })

      const getFinalSessionsRequest = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer token-123' },
      })

      const getFinalSessionsResponse = await sessionsGET(getFinalSessionsRequest)
      const getFinalSessionsData = await getFinalSessionsResponse.json()

      expect(getFinalSessionsResponse.status).toBe(200)
      expect(getFinalSessionsData.success).toBe(true)
      expect(getFinalSessionsData.data).toHaveLength(1)
      expect(getFinalSessionsData.data[0].title).toBe('Updated Chat Title')
    })

    it('should handle session deletion flow', async () => {
      // Setup: Session exists and belongs to user
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: sessionId, user_id: 'user-123', title: 'Session to Delete' },
        error: null,
      })

      // Mock successful deletion
      mockSupabase.from().delete().eq.mockResolvedValue({
        data: null,
        error: null,
      })

      const deleteSessionRequest = new NextRequest(`http://localhost:3000/api/sessions/${sessionId}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'delete' }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const deleteSessionResponse = await sessionUpdatePOST(deleteSessionRequest, { params: { id: sessionId } })
      const deleteSessionData = await deleteSessionResponse.json()

      expect(deleteSessionResponse.status).toBe(200)
      expect(deleteSessionData.success).toBe(true)
      expect(deleteSessionData.message).toContain('删除成功')

      // Verify sessions list is now empty
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: [],
        error: null,
      })

      const getSessionsAfterDeleteRequest = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer token-123' },
      })

      const getSessionsAfterDeleteResponse = await sessionsGET(getSessionsAfterDeleteRequest)
      const getSessionsAfterDeleteData = await getSessionsAfterDeleteResponse.json()

      expect(getSessionsAfterDeleteResponse.status).toBe(200)
      expect(getSessionsAfterDeleteData.data).toHaveLength(0)
    })
  })

  describe('Error Scenarios', () => {
    it('should handle authentication failures throughout the flow', async () => {
      // Mock authentication failure
      mockVerifyAuth.mockResolvedValue({ user: null, error: 'Unauthorized' })

      // Test sessions endpoint
      const getSessionsRequest = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'GET',
      })

      const getSessionsResponse = await sessionsGET(getSessionsRequest)
      const getSessionsData = await getSessionsResponse.json()

      expect(getSessionsResponse.status).toBe(401)
      expect(getSessionsData.error).toBe('UNAUTHORIZED')

      // Test messages endpoint
      const getMessagesRequest = new NextRequest(`http://localhost:3000/api/messages?session_id=${sessionId}`, {
        method: 'GET',
      })

      const getMessagesResponse = await messagesGET(getMessagesRequest)
      const getMessagesData = await getMessagesResponse.json()

      expect(getMessagesResponse.status).toBe(401)
      expect(getMessagesData.error).toBe('UNAUTHORIZED')
    })

    it('should handle permission violations', async () => {
      // User tries to access another user's session
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { id: sessionId, user_id: 'other-user' },
        error: null,
      })

      const getMessagesRequest = new NextRequest(`http://localhost:3000/api/messages?session_id=${sessionId}`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer token-123' },
      })

      const getMessagesResponse = await messagesGET(getMessagesRequest)
      const getMessagesData = await getMessagesResponse.json()

      expect(getMessagesResponse.status).toBe(403)
      expect(getMessagesData.error).toBe('ACCESS_DENIED')
    })

    it('should handle database connection failures', async () => {
      // Mock database connection error
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: null,
        error: { code: '08006', message: 'Connection failed' },
      })

      const getSessionsRequest = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer token-123' },
      })

      const getSessionsResponse = await sessionsGET(getSessionsRequest)
      const getSessionsData = await getSessionsResponse.json()

      expect(getSessionsResponse.status).toBe(503)
      expect(getSessionsData.error).toBe('SERVICE_UNAVAILABLE')
    })
  })

  describe('Data Validation Flow', () => {
    it('should validate data consistently across all endpoints', async () => {
      // Test invalid UUID format across different endpoints
      const invalidSessionId = 'invalid-uuid'

      // Test messages endpoint
      const getMessagesRequest = new NextRequest(`http://localhost:3000/api/messages?session_id=${invalidSessionId}`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer token-123' },
      })

      const getMessagesResponse = await messagesGET(getMessagesRequest)
      const getMessagesData = await getMessagesResponse.json()

      expect(getMessagesResponse.status).toBe(400)
      expect(getMessagesData.error).toBe('VALIDATION_ERROR')

      // Test session update endpoint
      const updateSessionRequest = new NextRequest(`http://localhost:3000/api/sessions/${invalidSessionId}`, {
        method: 'POST',
        body: JSON.stringify({ title: 'New Title' }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-123',
        },
      })

      const updateSessionResponse = await sessionUpdatePOST(updateSessionRequest, { params: { id: invalidSessionId } })
      const updateSessionData = await updateSessionResponse.json()

      expect(updateSessionResponse.status).toBe(400)
      expect(updateSessionData.error).toBe('INVALID_SESSION_ID')
    })
  })
})