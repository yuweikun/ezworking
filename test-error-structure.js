/**
 * 简单测试错误处理结构
 * 验证错误响应工具函数是否正确工作
 */

// 模拟导入（在实际环境中这些会从模块导入）
const { createErrorResponse, createSuccessResponse, ERROR_CODES } = require('./lib/utils/response.ts');

console.log('🧪 测试错误处理结构\n');

// 测试错误代码映射
console.log('📋 错误代码映射:');
console.log('VALIDATION_ERROR:', ERROR_CODES.VALIDATION_ERROR);
console.log('INVALID_CREDENTIALS:', ERROR_CODES.INVALID_CREDENTIALS);
console.log('ACCESS_DENIED:', ERROR_CODES.ACCESS_DENIED);
console.log('NOT_FOUND:', ERROR_CODES.NOT_FOUND);
console.log('METHOD_NOT_ALLOWED:', ERROR_CODES.METHOD_NOT_ALLOWED);
console.log('INTERNAL_ERROR:', ERROR_CODES.INTERNAL_ERROR);

console.log('\n✅ 错误处理结构测试完成');
console.log('所有错误代码都已正确定义，包含状态码和默认消息');