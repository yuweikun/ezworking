import { LoginRequest, RegisterRequest } from '../types';

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fieldErrors?: Record<string, string[]>;
  summary?: string;
}

/**
 * 字段验证错误接口
 */
export interface FieldValidationError {
  field: string;
  value: any;
  errors: string[];
}

/**
 * 创建验证结果
 */
export function createValidationResult(
  errors: string[] = [],
  fieldErrors: Record<string, string[]> = {}
): ValidationResult {
  const hasErrors = errors.length > 0 || Object.keys(fieldErrors).length > 0;
  
  return {
    isValid: !hasErrors,
    errors,
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
    summary: hasErrors 
      ? `发现 ${errors.length + Object.keys(fieldErrors).length} 个验证错误`
      : '验证通过'
  };
}

/**
 * 验证邮箱格式
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证密码强度
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push('密码长度至少为6位');
  }
  
  if (password.length > 100) {
    errors.push('密码长度不能超过100位');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 验证用户注册数据
 */
export function validateRegisterRequest(data: any): ValidationResult {
  const errors: string[] = [];
  const fieldErrors: Record<string, string[]> = {};
  
  // 验证邮箱字段
  if (!data.email) {
    fieldErrors.email = ['邮箱地址是必需的'];
  } else if (typeof data.email !== 'string') {
    fieldErrors.email = ['邮箱必须是字符串类型'];
  } else if (!validateEmail(data.email.trim())) {
    fieldErrors.email = ['邮箱格式无效，请输入有效的邮箱地址'];
  } else if (data.email.length > 254) {
    fieldErrors.email = ['邮箱长度不能超过254个字符'];
  }
  
  // 验证密码字段
  if (!data.password) {
    fieldErrors.password = ['密码是必需的'];
  } else if (typeof data.password !== 'string') {
    fieldErrors.password = ['密码必须是字符串类型'];
  } else {
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
      fieldErrors.password = passwordValidation.errors;
    }
  }
  
  // 验证可选的姓名字段
  if (data.name !== undefined) {
    if (typeof data.name !== 'string') {
      fieldErrors.name = ['姓名必须是字符串类型'];
    } else if (data.name.length > 100) {
      fieldErrors.name = ['姓名长度不能超过100个字符'];
    } else if (data.name.trim().length === 0) {
      fieldErrors.name = ['姓名不能为空'];
    }
  }
  
  // 检查是否有多余的字段
  const allowedFields = ['email', 'password', 'name'];
  const extraFields = Object.keys(data).filter(key => !allowedFields.includes(key));
  if (extraFields.length > 0) {
    errors.push(`不支持的字段: ${extraFields.join(', ')}`);
  }
  
  return createValidationResult(errors, fieldErrors);
}

/**
 * 验证用户登录数据
 */
export function validateLoginRequest(data: any): ValidationResult {
  const errors: string[] = [];
  const fieldErrors: Record<string, string[]> = {};
  
  // 验证邮箱字段
  if (!data.email) {
    fieldErrors.email = ['邮箱地址是必需的'];
  } else if (typeof data.email !== 'string') {
    fieldErrors.email = ['邮箱必须是字符串类型'];
  } else if (!validateEmail(data.email.trim())) {
    fieldErrors.email = ['邮箱格式无效'];
  }
  
  // 验证密码字段
  if (!data.password) {
    fieldErrors.password = ['密码是必需的'];
  } else if (typeof data.password !== 'string') {
    fieldErrors.password = ['密码必须是字符串类型'];
  } else if (data.password.length === 0) {
    fieldErrors.password = ['密码不能为空'];
  }
  
  // 检查是否有多余的字段
  const allowedFields = ['email', 'password'];
  const extraFields = Object.keys(data).filter(key => !allowedFields.includes(key));
  if (extraFields.length > 0) {
    errors.push(`不支持的字段: ${extraFields.join(', ')}`);
  }
  
  return createValidationResult(errors, fieldErrors);
}

/**
 * 验证会话创建数据
 */
export function validateSessionRequest(data: any): ValidationResult {
  const errors: string[] = [];
  const fieldErrors: Record<string, string[]> = {};
  
  // 验证用户ID字段
  if (!data.user_id) {
    fieldErrors.user_id = ['用户ID是必需的'];
  } else if (typeof data.user_id !== 'string') {
    fieldErrors.user_id = ['用户ID必须是字符串类型'];
  } else if (!validateUUID(data.user_id)) {
    fieldErrors.user_id = ['用户ID格式无效，必须是有效的UUID'];
  }
  
  // 验证会话标题字段
  if (!data.title) {
    fieldErrors.title = ['会话标题是必需的'];
  } else if (typeof data.title !== 'string') {
    fieldErrors.title = ['会话标题必须是字符串类型'];
  } else {
    const trimmedTitle = data.title.trim();
    if (trimmedTitle.length === 0) {
      fieldErrors.title = ['会话标题不能为空'];
    } else if (trimmedTitle.length > 200) {
      fieldErrors.title = ['会话标题长度不能超过200个字符'];
    } else if (trimmedTitle.length < 1) {
      fieldErrors.title = ['会话标题至少需要1个字符'];
    }
  }
  
  // 检查是否有多余的字段
  const allowedFields = ['user_id', 'title'];
  const extraFields = Object.keys(data).filter(key => !allowedFields.includes(key));
  if (extraFields.length > 0) {
    errors.push(`不支持的字段: ${extraFields.join(', ')}`);
  }
  
  return createValidationResult(errors, fieldErrors);
}

/**
 * 验证消息创建数据
 */
export function validateMessageRequest(data: any): ValidationResult {
  const errors: string[] = [];
  const fieldErrors: Record<string, string[]> = {};
  
  // 验证会话ID字段
  if (!data.session_id) {
    fieldErrors.session_id = ['会话ID是必需的'];
  } else if (typeof data.session_id !== 'string') {
    fieldErrors.session_id = ['会话ID必须是字符串类型'];
  } else if (!validateUUID(data.session_id)) {
    fieldErrors.session_id = ['会话ID格式无效，必须是有效的UUID'];
  }
  
  // 验证消息角色字段
  if (!data.role) {
    fieldErrors.role = ['消息角色是必需的'];
  } else if (typeof data.role !== 'string') {
    fieldErrors.role = ['消息角色必须是字符串类型'];
  } else if (!['user', 'ai'].includes(data.role)) {
    fieldErrors.role = ['消息角色必须是 "user" 或 "ai"'];
  }
  
  // 验证消息内容字段
  if (!data.content) {
    fieldErrors.content = ['消息内容是必需的'];
  } else if (typeof data.content !== 'string') {
    fieldErrors.content = ['消息内容必须是字符串类型'];
  } else {
    const trimmedContent = data.content.trim();
    if (trimmedContent.length === 0) {
      fieldErrors.content = ['消息内容不能为空'];
    } else if (trimmedContent.length > 10000) {
      fieldErrors.content = ['消息内容长度不能超过10000个字符'];
    }
  }
  
  // 验证可选的工作阶段字段
  if (data.work_stage !== undefined && data.work_stage !== null) {
    if (typeof data.work_stage !== 'string') {
      fieldErrors.work_stage = ['工作阶段必须是字符串类型'];
    } else if (data.work_stage.length > 100) {
      fieldErrors.work_stage = ['工作阶段长度不能超过100个字符'];
    }
  }
  
  // 检查是否有多余的字段
  const allowedFields = ['session_id', 'role', 'content', 'work_stage'];
  const extraFields = Object.keys(data).filter(key => !allowedFields.includes(key));
  if (extraFields.length > 0) {
    errors.push(`不支持的字段: ${extraFields.join(', ')}`);
  }
  
  return createValidationResult(errors, fieldErrors);
}

/**
 * 验证UUID格式
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * 验证查询参数
 */
export function validateQueryParams(
  searchParams: URLSearchParams, 
  requiredParams: string[],
  optionalParams: string[] = []
): ValidationResult {
  const errors: string[] = [];
  const fieldErrors: Record<string, string[]> = {};
  
  // 验证必需参数
  for (const param of requiredParams) {
    const value = searchParams.get(param);
    if (!value) {
      fieldErrors[param] = [`查询参数 "${param}" 是必需的`];
    } else if (value.trim().length === 0) {
      fieldErrors[param] = [`查询参数 "${param}" 不能为空`];
    }
  }
  
  // 验证所有参数的格式
  const allAllowedParams = [...requiredParams, ...optionalParams];
  for (const [key, value] of searchParams.entries()) {
    if (!allAllowedParams.includes(key)) {
      errors.push(`不支持的查询参数: "${key}"`);
      continue;
    }
    
    // 特定参数的格式验证
    if (key.includes('_id') && value && !validateUUID(value)) {
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(`${key} 必须是有效的UUID格式`);
    }
    
    if (key === 'page' && value) {
      const pageNum = parseInt(value, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        if (!fieldErrors[key]) fieldErrors[key] = [];
        fieldErrors[key].push('页码必须是大于0的整数');
      }
    }
    
    if (key === 'limit' && value) {
      const limitNum = parseInt(value, 10);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        if (!fieldErrors[key]) fieldErrors[key] = [];
        fieldErrors[key].push('限制数量必须是1-100之间的整数');
      }
    }
  }
  
  return createValidationResult(errors, fieldErrors);
}

/**
 * 清理和规范化输入数据
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

/**
 * 验证会话更新数据
 */
export function validateSessionUpdateRequest(data: any): ValidationResult {
  const errors: string[] = [];
  const fieldErrors: Record<string, string[]> = {};
  
  // 如果是删除操作，只需要验证action字段
  if (data.action === 'delete') {
    const allowedFields = ['action'];
    const extraFields = Object.keys(data).filter(key => !allowedFields.includes(key));
    if (extraFields.length > 0) {
      errors.push(`删除操作不支持额外字段: ${extraFields.join(', ')}`);
    }
    return createValidationResult(errors, fieldErrors);
  }
  
  // 验证操作类型
  if (data.action && data.action !== 'delete') {
    fieldErrors.action = ['操作类型只支持 "delete"'];
  }
  
  // 如果是更新操作，验证可更新的字段
  if (data.title !== undefined) {
    if (typeof data.title !== 'string') {
      fieldErrors.title = ['会话标题必须是字符串类型'];
    } else {
      const trimmedTitle = data.title.trim();
      if (trimmedTitle.length === 0) {
        fieldErrors.title = ['会话标题不能为空'];
      } else if (trimmedTitle.length > 200) {
        fieldErrors.title = ['会话标题长度不能超过200个字符'];
      }
    }
  }
  
  // 检查是否有多余的字段
  const allowedFields = ['action', 'title'];
  const extraFields = Object.keys(data).filter(key => !allowedFields.includes(key));
  if (extraFields.length > 0) {
    errors.push(`不支持的字段: ${extraFields.join(', ')}`);
  }
  
  // 如果没有任何有效的更新字段，返回错误
  if (!data.action && data.title === undefined) {
    errors.push('必须提供要更新的字段或操作类型');
  }
  
  return createValidationResult(errors, fieldErrors);
}
/**

 * 验证分页参数
 */
export function validatePaginationParams(searchParams: URLSearchParams): ValidationResult {
  const errors: string[] = [];
  const fieldErrors: Record<string, string[]> = {};
  
  const page = searchParams.get('page');
  const limit = searchParams.get('limit');
  
  if (page) {
    const pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      fieldErrors.page = ['页码必须是大于0的整数'];
    } else if (pageNum > 1000) {
      fieldErrors.page = ['页码不能超过1000'];
    }
  }
  
  if (limit) {
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1) {
      fieldErrors.limit = ['限制数量必须是大于0的整数'];
    } else if (limitNum > 100) {
      fieldErrors.limit = ['限制数量不能超过100'];
    }
  }
  
  return createValidationResult(errors, fieldErrors);
}

/**
 * 验证请求体是否为有效JSON
 */
export async function validateRequestBody(request: Request): Promise<{ isValid: boolean; data?: any; error?: string }> {
  try {
    const data = await request.json();
    return { isValid: true, data };
  } catch (error) {
    return { 
      isValid: false, 
      error: '请求体必须是有效的JSON格式' 
    };
  }
}

/**
 * 验证内容长度
 */
export function validateContentLength(content: string, maxLength: number, fieldName: string = '内容'): string[] {
  const errors: string[] = [];
  
  if (content.length > maxLength) {
    errors.push(`${fieldName}长度不能超过${maxLength}个字符`);
  }
  
  return errors;
}

/**
 * 验证必需字段
 */
export function validateRequiredFields(data: any, requiredFields: string[]): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      fieldErrors[field] = [`${field} 是必需的`];
    } else if (typeof data[field] === 'string' && data[field].trim().length === 0) {
      fieldErrors[field] = [`${field} 不能为空`];
    }
  }
  
  return fieldErrors;
}

/**
 * 验证字段类型
 */
export function validateFieldTypes(data: any, fieldTypes: Record<string, string>): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  
  for (const [field, expectedType] of Object.entries(fieldTypes)) {
    if (data[field] !== undefined && typeof data[field] !== expectedType) {
      fieldErrors[field] = [`${field} 必须是${expectedType}类型`];
    }
  }
  
  return fieldErrors;
}

/**
 * 验证枚举值
 */
export function validateEnumField(value: any, allowedValues: string[], fieldName: string): string[] {
  const errors: string[] = [];
  
  if (value !== undefined && !allowedValues.includes(value)) {
    errors.push(`${fieldName} 必须是以下值之一: ${allowedValues.join(', ')}`);
  }
  
  return errors;
}

/**
 * 合并验证结果
 */
export function mergeValidationResults(...results: ValidationResult[]): ValidationResult {
  const allErrors: string[] = [];
  const allFieldErrors: Record<string, string[]> = {};
  
  for (const result of results) {
    allErrors.push(...result.errors);
    
    if (result.fieldErrors) {
      for (const [field, errors] of Object.entries(result.fieldErrors)) {
        if (!allFieldErrors[field]) {
          allFieldErrors[field] = [];
        }
        allFieldErrors[field].push(...errors);
      }
    }
  }
  
  return createValidationResult(allErrors, allFieldErrors);
}

/**
 * 验证数组字段
 */
export function validateArrayField(
  value: any, 
  fieldName: string, 
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    itemValidator?: (item: any, index: number) => string[];
  } = {}
): string[] {
  const errors: string[] = [];
  
  if (options.required && (value === undefined || value === null)) {
    errors.push(`${fieldName} 是必需的`);
    return errors;
  }
  
  if (value === undefined || value === null) {
    return errors;
  }
  
  if (!Array.isArray(value)) {
    errors.push(`${fieldName} 必须是数组类型`);
    return errors;
  }
  
  if (options.minLength !== undefined && value.length < options.minLength) {
    errors.push(`${fieldName} 至少需要${options.minLength}个元素`);
  }
  
  if (options.maxLength !== undefined && value.length > options.maxLength) {
    errors.push(`${fieldName} 最多只能有${options.maxLength}个元素`);
  }
  
  if (options.itemValidator) {
    value.forEach((item, index) => {
      const itemErrors = options.itemValidator!(item, index);
      errors.push(...itemErrors.map(err => `${fieldName}[${index}]: ${err}`));
    });
  }
  
  return errors;
}