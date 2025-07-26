#!/usr/bin/env node

/**
 * Comprehensive API Test Runner
 * 
 * This script runs all API tests and provides detailed reporting
 * on test coverage, authentication flows, and RLS policy validation.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Comprehensive API Test Suite\n');

// Test categories
const testCategories = [
  {
    name: 'Authentication Tests',
    pattern: '__tests__/api/auth/**/*.test.ts',
    description: '测试用户注册和登录功能'
  },
  {
    name: 'Session Management Tests',
    pattern: '__tests__/api/sessions/**/*.test.ts',
    description: '测试会话创建、更新和删除功能'
  },
  {
    name: 'Message Management Tests',
    pattern: '__tests__/api/messages/**/*.test.ts',
    description: '测试消息创建和历史查询功能'
  },
  {
    name: 'Utility Function Tests',
    pattern: '__tests__/lib/utils/**/*.test.ts',
    description: '测试验证和响应工具函数'
  },
  {
    name: 'Integration Tests',
    pattern: '__tests__/integration/**/*.test.ts',
    description: '测试完整的API流程和用户旅程'
  }
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function runTestCategory(category) {
  console.log(colorize(`\n📋 ${category.name}`, 'cyan'));
  console.log(colorize(`   ${category.description}`, 'blue'));
  console.log(colorize('   ' + '─'.repeat(50), 'blue'));
  
  try {
    const result = execSync(`npm test -- --testPathPattern="${category.pattern}" --verbose`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log(colorize('   ✅ 所有测试通过', 'green'));
    return true;
  } catch (error) {
    console.log(colorize('   ❌ 测试失败', 'red'));
    console.log(colorize(`   错误: ${error.message}`, 'red'));
    return false;
  }
}

function runCoverageReport() {
  console.log(colorize('\n📊 生成测试覆盖率报告', 'magenta'));
  console.log(colorize('   ' + '─'.repeat(50), 'blue'));
  
  try {
    execSync('npm run test:coverage', {
      stdio: 'inherit'
    });
    console.log(colorize('   ✅ 覆盖率报告生成完成', 'green'));
    return true;
  } catch (error) {
    console.log(colorize('   ❌ 覆盖率报告生成失败', 'red'));
    return false;
  }
}

function validateTestRequirements() {
  console.log(colorize('🔍 验证测试环境要求', 'yellow'));
  console.log(colorize('   ' + '─'.repeat(50), 'blue'));
  
  const requirements = [
    { name: 'Jest配置文件', path: 'jest.config.js' },
    { name: 'Jest设置文件', path: 'jest.setup.js' },
    { name: '认证测试', path: '__tests__/api/auth' },
    { name: '会话测试', path: '__tests__/api/sessions' },
    { name: '消息测试', path: '__tests__/api/messages' },
    { name: '工具函数测试', path: '__tests__/lib/utils' },
    { name: '集成测试', path: '__tests__/integration' }
  ];
  
  let allRequirementsMet = true;
  
  requirements.forEach(req => {
    const exists = fs.existsSync(path.join(__dirname, req.path));
    if (exists) {
      console.log(colorize(`   ✅ ${req.name}`, 'green'));
    } else {
      console.log(colorize(`   ❌ ${req.name} - 缺失`, 'red'));
      allRequirementsMet = false;
    }
  });
  
  return allRequirementsMet;
}

function generateTestSummary(results) {
  console.log(colorize('\n📈 测试结果摘要', 'bright'));
  console.log(colorize('   ' + '═'.repeat(50), 'blue'));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(colorize(`   总测试类别: ${total}`, 'blue'));
  console.log(colorize(`   通过: ${passed}`, passed === total ? 'green' : 'yellow'));
  console.log(colorize(`   失败: ${total - passed}`, total - passed === 0 ? 'green' : 'red'));
  
  if (passed === total) {
    console.log(colorize('\n   🎉 所有API测试通过！', 'green'));
    console.log(colorize('   ✨ API实现符合所有需求规范', 'green'));
  } else {
    console.log(colorize('\n   ⚠️  部分测试失败，需要修复', 'yellow'));
  }
  
  console.log(colorize('\n   测试覆盖的功能:', 'blue'));
  console.log(colorize('   • 用户注册和登录认证', 'blue'));
  console.log(colorize('   • JWT令牌验证和权限检查', 'blue'));
  console.log(colorize('   • 会话创建、更新和删除', 'blue'));
  console.log(colorize('   • 消息创建和历史查询', 'blue'));
  console.log(colorize('   • 数据验证和错误处理', 'blue'));
  console.log(colorize('   • RLS策略和权限控制', 'blue'));
  console.log(colorize('   • 数据库操作和错误恢复', 'blue'));
  console.log(colorize('   • 完整的用户旅程流程', 'blue'));
}

async function main() {
  // Step 1: Validate test environment
  if (!validateTestRequirements()) {
    console.log(colorize('\n❌ 测试环境验证失败，请检查缺失的文件', 'red'));
    process.exit(1);
  }
  
  // Step 2: Run test categories
  const results = [];
  
  for (const category of testCategories) {
    const passed = runTestCategory(category);
    results.push({ category: category.name, passed });
  }
  
  // Step 3: Generate coverage report
  const coverageSuccess = runCoverageReport();
  
  // Step 4: Generate summary
  generateTestSummary(results);
  
  // Step 5: Exit with appropriate code
  const allPassed = results.every(r => r.passed) && coverageSuccess;
  process.exit(allPassed ? 0 : 1);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log(colorize('\n\n⏹️  测试被用户中断', 'yellow'));
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.log(colorize('\n❌ 测试运行器遇到未处理的异常:', 'red'));
  console.log(colorize(error.message, 'red'));
  process.exit(1);
});

// Run the main function
main().catch(error => {
  console.log(colorize('\n❌ 测试运行器执行失败:', 'red'));
  console.log(colorize(error.message, 'red'));
  process.exit(1);
});