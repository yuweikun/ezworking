import {
  validateEmail,
  validatePassword,
  validateRegisterRequest,
  validateLoginRequest,
  validateSessionRequest,
  validateMessageRequest,
  validateUUID,
  validateQueryParams,
  validateSessionUpdateRequest,
  createValidationResult,
} from '@/lib/utils/validation'

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name@domain.co.uk')).toBe(true)
      expect(validateEmail('test+tag@example.org')).toBe(true)
    })

    it('should reject invalid email formats', () => {
      expect(validateEmail('invalid-email')).toBe(false)
      expect(validateEmail('test@')).toBe(false)
      expect(validateEmail('@example.com')).toBe(false)
      expect(validateEmail('test.example.com')).toBe(false)
      expect(validateEmail('')).toBe(false)
    })
  })

  describe('validatePassword', () => {
    it('should accept valid passwords', () => {
      const result = validatePassword('password123')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject passwords that are too short', () => {
      const result = validatePassword('123')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('密码长度至少为6位')
    })

    it('should reject passwords that are too long', () => {
      const longPassword = 'a'.repeat(101)
      const result = validatePassword(longPassword)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('密码长度不能超过100位')
    })
  })

  describe('validateUUID', () => {
    it('should validate correct UUID formats', () => {
      expect(validateUUID('550e8400-e29b-41d4-a716-446655440001')).toBe(true)
      expect(validateUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true)
      expect(validateUUID('6ba7b811-9dad-11d1-80b4-00c04fd430c8')).toBe(true)
    })

    it('should reject invalid UUID formats', () => {
      expect(validateUUID('invalid-uuid')).toBe(false)
      expect(validateUUID('550e8400-e29b-41d4-a716')).toBe(false)
      expect(validateUUID('550e8400-e29b-41d4-a716-446655440001-extra')).toBe(false)
      expect(validateUUID('')).toBe(false)
      expect(validateUUID('550e8400-e29b-41d4-g716-446655440001')).toBe(false)
    })
  })

  describe('validateRegisterRequest', () => {
    it('should validate correct registration data', () => {
      const data = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      }
      const result = validateRegisterRequest(data)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate registration data without optional name', () => {
      const data = {
        email: 'test@example.com',
        password: 'password123',
      }
      const result = validateRegisterRequest(data)
      expect(result.isValid).toBe(true)
    })

    it('should reject missing email', () => {
      const data = {
        password: 'password123',
      }
      const result = validateRegisterRequest(data)
      expect(result.isValid).toBe(false)
      expect(result.fieldErrors?.email).toContain('邮箱地址是必需的')
    })

    it('should reject invalid email format', () => {
      const data = {
        email: 'invalid-email',
        password: 'password123',
      }
      const result = validateRegisterRequest(data)
      expect(result.isValid).toBe(false)
      expect(result.fieldErrors?.email).toContain('邮箱格式无效，请输入有效的邮箱地址')
    })

    it('should reject weak password', () => {
      const data = {
        email: 'test@example.com',
        password: '123',
      }
      const result = validateRegisterRequest(data)
      expect(result.isValid).toBe(false)
      expect(result.fieldErrors?.password).toContain('密码长度至少为6位')
    })

    it('should reject extra fields', () => {
      const data = {
        email: 'test@example.com',
        password: 'password123',
        extraField: 'not allowed',
      }
      const result = validateRegisterRequest(data)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('不支持的字段: extraField')
    })
  })

  describe('validateLoginRequest', () => {
    it('should validate correct login data', () => {
      const data = {
        email: 'test@example.com',
        password: 'password123',
      }
      const result = validateLoginRequest(data)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject missing email', () => {
      const data = {
        password: 'password123',
      }
      const result = validateLoginRequest(data)
      expect(result.isValid).toBe(false)
      expect(result.fieldErrors?.email).toContain('邮箱地址是必需的')
    })

    it('should reject missing password', () => {
      const data = {
        email: 'test@example.com',
      }
      const result = validateLoginRequest(data)
      expect(result.isValid).toBe(false)
      expect(result.fieldErrors?.password).toContain('密码是必需的')
    })

    it('should reject empty password', () => {
      const data = {
        email: 'test@example.com',
        password: '',
      }
      const result = validateLoginRequest(data)
      expect(result.isValid).toBe(false)
      expect(result.fieldErrors?.password).toContain('密码不能为空')
    })
  })

  describe('validateSessionRequest', () => {
    it('should validate correct session data', () => {
      const data = {
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Test Session',
      }
      const result = validateSessionRequest(data)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject missing user_id', () => {
      const data = {
        title: 'Test Session',
      }
      const result = validateSessionRequest(data)
      expect(result.isValid).toBe(false)
      expect(result.fieldErrors?.user_id).toContain('用户ID是必需的')
    })

    it('should reject invalid user_id format', () => {
      const data = {
        user_id: 'invalid-uuid',
        title: 'Test Session',
      }
      const result = validateSessionRequest(data)
      expect(result.isValid).toBe(false)
      expect(result.fieldErrors?.user_id).toContain('用户ID格式无效，必须是有效的UUID')
    })

    it('should reject missing title', () => {
      const data = {
        user_id: '550e8400-e29b-41d4-a716-446655440001',
      }
      const result = validateSessionRequest(data)
      expect(result.isValid).toBe(false)
      expect(result.fieldErrors?.title).toContain('会话标题是必需的')
    })

    it('should reject empty title', () => {
      const data = {
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        title: '   ',
      }
      const result = validateSessionRequest(data)
      expect(result.isValid).toBe(false)
      expect(result.fieldErrors?.title).toContain('会话标题不能为空')
    })

    it('should reject title too long', () => {
      const data = {
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'a'.repeat(201),
      }
      const result = validateSessionRequest(data)
      expect(result.isValid).toBe(false)
      expect(result.fieldErrors?.title).toContain('会话标题长度不能超过200个字符')
    })
  })

  describe('validateMessageRequest', () => {
    it('should validate correct message data', () => {
      const data = {
        session_id: '550e8400-e29b-41d4-a716-446655440001',
        role: 'user',
        content: 'Test message',
        work_stage: 'testing',
      }
      const result = validateMessageRequest(data)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate message data without work_stage', () => {
      const data = {
        session_id: '550e8400-e29b-41d4-a716-446655440001',
        role: 'ai',
        content: 'AI response',
      }
      const result = validateMessageRequest(data)
      expect(result.isValid).toBe(true)
    })

    it('should reject missing session_id', () => {
      const data = {
        role: 'user',
        content: 'Test message',
      }
      const result = validateMessageRequest(data)
      expect(result.isValid).toBe(false)
      expect(result.fieldErrors?.session_id).toContain('会话ID是必需的')
    })

    it('should reject invalid session_id format', () => {
      const data = {
        session_id: 'invalid-uuid',
        role: 'user',
        content: 'Test message',
      }
      const result = validateMessageRequest(data)
      expect(result.isValid).toBe(false)
      expect(result.fieldErrors?.session_id).toContain('会话ID格式无效，必须是有效的UUID')
    })

    it('should reject invalid role', () => {
      const data = {
        session_id: '550e8400-e29b-41d4-a716-446655440001',
        role: 'invalid_role',
        content: 'Test message',
      }
      const result = validateMessageRequest(data)
      expect(result.isValid).toBe(false)
      expect(result.fieldErrors?.role).toContain('消息角色必须是 "user" 或 "ai"')
    })

    it('should reject missing content', () => {
      const data = {
        session_id: '550e8400-e29b-41d4-a716-446655440001',
        role: 'user',
      }
      const result = validateMessageRequest(data)
      expect(result.isValid).toBe(false)
      expect(result.fieldErrors?.content).toContain('消息内容是必需的')
    })

    it('should reject empty content', () => {
      const data = {
        session_id: '550e8400-e29b-41d4-a716-446655440001',
        role: 'user',
        content: '   ',
      }
      const result = validateMessageRequest(data)
      expect(result.isValid).toBe(false)
      expect(result.fieldErrors?.content).toContain('消息内容不能为空')
    })

    it('should reject content too long', () => {
      const data = {
        session_id: '550e8400-e29b-41d4-a716-446655440001',
        role: 'user',
        content: 'a'.repeat(10001),
      }
      const result = validateMessageRequest(data)
      expect(result.isValid).toBe(false)
      expect(result.fieldErrors?.content).toContain('消息内容长度不能超过10000个字符')
    })
  })

  describe('validateSessionUpdateRequest', () => {
    it('should validate delete action', () => {
      const data = {
        action: 'delete',
      }
      const result = validateSessionUpdateRequest(data)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate title update', () => {
      const data = {
        title: 'Updated Title',
      }
      const result = validateSessionUpdateRequest(data)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid action', () => {
      const data = {
        action: 'invalid_action',
      }
      const result = validateSessionUpdateRequest(data)
      expect(result.isValid).toBe(false)
      expect(result.fieldErrors?.action).toContain('操作类型只支持 "delete"')
    })

    it('should reject empty title', () => {
      const data = {
        title: '   ',
      }
      const result = validateSessionUpdateRequest(data)
      expect(result.isValid).toBe(false)
      expect(result.fieldErrors?.title).toContain('会话标题不能为空')
    })

    it('should reject no valid fields', () => {
      const data = {}
      const result = validateSessionUpdateRequest(data)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('必须提供要更新的字段或操作类型')
    })
  })

  describe('validateQueryParams', () => {
    it('should validate required parameters', () => {
      const searchParams = new URLSearchParams('session_id=550e8400-e29b-41d4-a716-446655440001')
      const result = validateQueryParams(searchParams, ['session_id'])
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject missing required parameters', () => {
      const searchParams = new URLSearchParams('')
      const result = validateQueryParams(searchParams, ['session_id'])
      expect(result.isValid).toBe(false)
      expect(result.fieldErrors?.session_id).toContain('查询参数 "session_id" 是必需的')
    })

    it('should reject invalid UUID in parameters', () => {
      const searchParams = new URLSearchParams('session_id=invalid-uuid')
      const result = validateQueryParams(searchParams, ['session_id'])
      expect(result.isValid).toBe(false)
      expect(result.fieldErrors?.session_id).toContain('session_id 必须是有效的UUID格式')
    })

    it('should reject unsupported parameters', () => {
      const searchParams = new URLSearchParams('session_id=550e8400-e29b-41d4-a716-446655440001&invalid_param=value')
      const result = validateQueryParams(searchParams, ['session_id'])
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('不支持的查询参数: "invalid_param"')
    })
  })

  describe('createValidationResult', () => {
    it('should create valid result with no errors', () => {
      const result = createValidationResult()
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.summary).toBe('验证通过')
    })

    it('should create invalid result with errors', () => {
      const result = createValidationResult(['Error 1', 'Error 2'])
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(2)
      expect(result.summary).toContain('发现 2 个验证错误')
    })

    it('should create invalid result with field errors', () => {
      const fieldErrors = { email: ['Invalid email'], password: ['Too short'] }
      const result = createValidationResult([], fieldErrors)
      expect(result.isValid).toBe(false)
      expect(result.fieldErrors).toEqual(fieldErrors)
      expect(result.summary).toContain('发现 2 个验证错误')
    })
  })
})