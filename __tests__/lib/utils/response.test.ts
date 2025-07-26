import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  handleApiError,
  validateMethod,
  formatMessageHistoryResponse,
  ERROR_CODES,
} from '@/lib/utils/response'
import { createValidationResult } from '@/lib/utils/validation'

describe('Response Utils', () => {
  describe('createSuccessResponse', () => {
    it('should create success response with data', async () => {
      const data = { message: 'Success' }
      const response = createSuccessResponse(data)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(data)
      expect(json.timestamp).toBeDefined()
    })

    it('should create success response with custom status', async () => {
      const data = { id: 'new-item' }
      const response = createSuccessResponse(data, 201)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(data)
    })
  })

  describe('createErrorResponse', () => {
    it('should create error response with known error code', async () => {
      const response = createErrorResponse('VALIDATION_ERROR')
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe('VALIDATION_ERROR')
      expect(json.message).toBe('请求参数验证失败')
      expect(json.timestamp).toBeDefined()
    })

    it('should create error response with custom message', async () => {
      const customMessage = 'Custom error message'
      const response = createErrorResponse('VALIDATION_ERROR', customMessage)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe('VALIDATION_ERROR')
      expect(json.message).toBe(customMessage)
    })

    it('should create error response with custom status', async () => {
      const response = createErrorResponse('VALIDATION_ERROR', undefined, 422)
      const json = await response.json()

      expect(response.status).toBe(422)
      expect(json.error).toBe('VALIDATION_ERROR')
    })

    it('should create error response with details', async () => {
      const details = { field: 'email', value: 'invalid' }
      const response = createErrorResponse('VALIDATION_ERROR', undefined, undefined, details)
      const json = await response.json()

      expect(json.details).toEqual(details)
    })

    it('should handle unknown error codes', async () => {
      const response = createErrorResponse('UNKNOWN_ERROR')
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe('UNKNOWN_ERROR')
      expect(json.message).toBe('未知错误')
    })
  })

  describe('createValidationErrorResponse', () => {
    it('should create validation error response', async () => {
      const validationResult = createValidationResult(['Error 1'], { email: ['Invalid email'] })
      const response = createValidationErrorResponse(validationResult)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe('VALIDATION_ERROR')
      expect(json.details.validationErrors).toEqual(['Error 1', 'Invalid email'])
      expect(json.details.fieldCount).toBe(2)
      expect(json.details.fieldErrors).toEqual({ email: ['Invalid email'] })
    })
  })

  describe('validateMethod', () => {
    it('should return null for allowed method', () => {
      const request = new Request('http://localhost:3000/api/test', { method: 'GET' })
      const result = validateMethod(request, ['GET', 'POST'])
      expect(result).toBeNull()
    })

    it('should return error response for disallowed method', async () => {
      const request = new Request('http://localhost:3000/api/test', { method: 'PUT' })
      const result = validateMethod(request, ['GET', 'POST'])
      
      expect(result).not.toBeNull()
      const json = await result!.json()
      expect(result!.status).toBe(405)
      expect(json.error).toBe('METHOD_NOT_ALLOWED')
      expect(json.message).toContain('方法 PUT 不被允许')
    })
  })

  describe('formatMessageHistoryResponse', () => {
    it('should format message history correctly', async () => {
      const messages = [
        {
          role: 'user',
          content: 'Hello',
          work_stage: 'greeting',
        },
        {
          role: 'ai',
          content: 'Hi there!',
          work_stage: 'response',
        },
      ]

      const response = formatMessageHistoryResponse(messages)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.history).toHaveLength(2)
      expect(json.data.history[0]).toEqual({
        role: 'user',
        content: 'Hello',
        workflow_stage: 'greeting',
      })
      expect(json.data.count).toBe(2)
      expect(json.data.hasMessages).toBe(true)
    })

    it('should handle empty message history', async () => {
      const response = formatMessageHistoryResponse([])
      const json = await response.json()

      expect(json.data.history).toHaveLength(0)
      expect(json.data.count).toBe(0)
      expect(json.data.hasMessages).toBe(false)
    })
  })

  describe('handleApiError', () => {
    it('should handle Supabase unique constraint violation', async () => {
      const error = { code: '23505', message: 'Unique constraint violation' }
      const response = handleApiError(error)
      const json = await response.json()

      expect(response.status).toBe(409)
      expect(json.error).toBe('DUPLICATE_ENTRY')
    })

    it('should handle Supabase foreign key constraint violation', async () => {
      const error = { code: '23503', message: 'Foreign key constraint violation' }
      const response = handleApiError(error)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe('INVALID_REFERENCE')
    })

    it('should handle Supabase RLS policy violation', async () => {
      const error = { code: 'PGRST116', message: 'RLS policy violation' }
      const response = handleApiError(error)
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe('ACCESS_DENIED')
    })

    it('should handle Supabase not found error', async () => {
      const error = { code: 'PGRST301', message: 'Resource not found' }
      const response = handleApiError(error)
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe('NOT_FOUND')
    })

    it('should handle Supabase connection failure', async () => {
      const error = { code: '08006', message: 'Connection failed' }
      const response = handleApiError(error)
      const json = await response.json()

      expect(response.status).toBe(503)
      expect(json.error).toBe('SERVICE_UNAVAILABLE')
    })

    it('should handle invalid login credentials', async () => {
      const error = { message: 'Invalid login credentials' }
      const response = handleApiError(error)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe('INVALID_CREDENTIALS')
    })

    it('should handle user already registered', async () => {
      const error = { message: 'User already registered' }
      const response = handleApiError(error)
      const json = await response.json()

      expect(response.status).toBe(409)
      expect(json.error).toBe('USER_EXISTS')
    })

    it('should handle email not confirmed', async () => {
      const error = { message: 'Email not confirmed' }
      const response = handleApiError(error)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe('EMAIL_NOT_CONFIRMED')
    })

    it('should handle too many requests', async () => {
      const error = { message: 'Too many requests' }
      const response = handleApiError(error)
      const json = await response.json()

      expect(response.status).toBe(429)
      expect(json.error).toBe('TOO_MANY_REQUESTS')
    })

    it('should handle invalid JWT', async () => {
      const error = { message: 'Invalid JWT' }
      const response = handleApiError(error)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe('TOKEN_INVALID')
    })

    it('should handle JWT expired', async () => {
      const error = { message: 'JWT expired' }
      const response = handleApiError(error)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe('TOKEN_EXPIRED')
    })

    it('should handle timeout errors', async () => {
      const error = { name: 'TimeoutError', message: 'Request timeout' }
      const response = handleApiError(error)
      const json = await response.json()

      expect(response.status).toBe(504)
      expect(json.error).toBe('TIMEOUT')
    })

    it('should handle network errors', async () => {
      const error = { name: 'NetworkError', message: 'Network error' }
      const response = handleApiError(error)
      const json = await response.json()

      expect(response.status).toBe(503)
      expect(json.error).toBe('SERVICE_UNAVAILABLE')
    })

    it('should handle JSON syntax errors', async () => {
      const error = new SyntaxError('Unexpected token in JSON')
      const response = handleApiError(error)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe('INVALID_JSON')
    })

    it('should handle unknown errors', async () => {
      const error = new Error('Unknown error')
      const response = handleApiError(error)
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.error).toBe('INTERNAL_ERROR')
    })

    it('should include context in error details', async () => {
      const error = new Error('Test error')
      const context = 'Test context'
      const response = handleApiError(error, context)
      const json = await response.json()

      expect(json.details.context).toBe(context)
      expect(json.details.originalError).toBe('Test error')
    })
  })

  describe('ERROR_CODES', () => {
    it('should have correct structure for all error codes', () => {
      Object.entries(ERROR_CODES).forEach(([code, config]) => {
        expect(config).toHaveProperty('status')
        expect(config).toHaveProperty('message')
        expect(typeof config.status).toBe('number')
        expect(typeof config.message).toBe('string')
        expect(config.status).toBeGreaterThanOrEqual(400)
        expect(config.status).toBeLessThan(600)
      })
    })

    it('should have appropriate status codes for different error types', () => {
      expect(ERROR_CODES.VALIDATION_ERROR.status).toBe(400)
      expect(ERROR_CODES.UNAUTHORIZED.status).toBe(401)
      expect(ERROR_CODES.ACCESS_DENIED.status).toBe(403)
      expect(ERROR_CODES.NOT_FOUND.status).toBe(404)
      expect(ERROR_CODES.METHOD_NOT_ALLOWED.status).toBe(405)
      expect(ERROR_CODES.DUPLICATE_ENTRY.status).toBe(409)
      expect(ERROR_CODES.TOO_MANY_REQUESTS.status).toBe(429)
      expect(ERROR_CODES.INTERNAL_ERROR.status).toBe(500)
      expect(ERROR_CODES.SERVICE_UNAVAILABLE.status).toBe(503)
    })
  })
})