import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { ENV } from '../config/env';
import { ERROR_MESSAGES } from '../types/constants';
import { ApiError } from '../types/auth';

// 创建axios实例
const httpClient: AxiosInstance = axios.create({
  baseURL: ENV.API_URL,
  timeout: ENV.AUTH_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
httpClient.interceptors.request.use(
  (config) => {
    // 从localStorage获取token并添加到请求头
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('请求配置错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
httpClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    console.error('响应错误:', error.response?.status, error.config?.url);
    
    // 统一错误处理
    const apiError = handleApiError(error);
    return Promise.reject(apiError);
  }
);

// 统一错误处理函数
function handleApiError(error: AxiosError): ApiError {
  // 网络错误
  if (!error.response) {
    return {
      message: ERROR_MESSAGES.NETWORK_ERROR,
      code: 'NETWORK_ERROR'
    };
  }

  const { status, data } = error.response;

  // 根据HTTP状态码处理错误
  switch (status) {
    case 400:
      // 处理验证错误
      if (data && typeof data === 'object' && 'message' in data) {
        return {
          message: data.message as string,
          code: 'VALIDATION_ERROR'
        };
      }
      return {
        message: ERROR_MESSAGES.INVALID_CREDENTIALS,
        code: 'BAD_REQUEST'
      };

    case 401:
      // 未授权 - 清除本地存储的认证信息
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
      return {
        message: ERROR_MESSAGES.INVALID_CREDENTIALS,
        code: 'UNAUTHORIZED'
      };

    case 409:
      // 冲突 - 通常是邮箱已存在
      return {
        message: ERROR_MESSAGES.EMAIL_EXISTS,
        code: 'CONFLICT'
      };

    case 422:
      // 处理表单验证错误
      if (data && typeof data === 'object' && 'message' in data) {
        return {
          message: data.message as string,
          code: 'VALIDATION_ERROR'
        };
      }
      return {
        message: ERROR_MESSAGES.INVALID_EMAIL,
        code: 'VALIDATION_ERROR'
      };

    case 500:
    case 502:
    case 503:
    case 504:
      // 服务器错误
      return {
        message: ERROR_MESSAGES.UNKNOWN_ERROR,
        code: 'SERVER_ERROR'
      };

    default:
      // 其他错误
      return {
        message: ERROR_MESSAGES.UNKNOWN_ERROR,
        code: 'UNKNOWN_ERROR'
      };
  }
}

export default httpClient;