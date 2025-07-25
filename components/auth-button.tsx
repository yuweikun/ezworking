'use client';

import React, { useState, useEffect } from 'react';
import { Avatar, Dropdown, Space } from 'antd';
import { UserOutlined, LoginOutlined, LogoutOutlined } from '@ant-design/icons';
import { createStyles } from 'antd-style';
import { useAuth } from '../contexts/auth-context';
import { AuthModal } from './auth-modal';

// 样式定义
const useStyles = createStyles(({ token, css }) => ({
  authButton: css`
    flex: 1;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 0 8px;
    border: none;
    background: transparent;
    border-radius: ${token.borderRadius}px;
    cursor: pointer;
    transition: all 0.2s;
    color: ${token.colorText};
    min-width: 0; /* 允许flex收缩 */

    &:hover {
      background: ${token.colorFillSecondary};
    }

    &:focus {
      outline: none;
      background: ${token.colorFillSecondary};
    }

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 2px;
    }

    /* 响应式设计 */
    @media (max-width: 768px) {
      height: 36px;
      padding: 0 6px;
    }

    @media (max-width: 480px) {
      height: 44px; /* 移动端更大的触摸区域 */
      padding: 0 8px;
    }
  `,
  userInfo: css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  `,
  userEmail: css`
    font-size: 14px;
    color: ${token.colorText};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0; /* 允许文本截断 */

    /* 响应式设计 */
    @media (max-width: 768px) {
      font-size: 13px;
    }

    @media (max-width: 480px) {
      font-size: 14px;
    }

    @media (max-width: 360px) {
      font-size: 12px;
    }
  `,
  loginText: css`
    font-size: 14px;
    color: ${token.colorText};
    margin-left: 8px;

    /* 响应式设计 */
    @media (max-width: 768px) {
      font-size: 13px;
      margin-left: 6px;
    }

    @media (max-width: 480px) {
      font-size: 14px;
      margin-left: 8px;
    }

    @media (max-width: 360px) {
      font-size: 12px;
      margin-left: 6px;
    }
  `,
  dropdownMenu: css`
    min-width: 160px;
  `,
}));

// AuthButton组件Props类型
interface AuthButtonProps {
  className?: string;
}

// AuthButton组件
export function AuthButton({ className }: AuthButtonProps) {
  const { styles } = useStyles();
  const { isAuthenticated, user, logout, loading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 处理登录按钮点击
  const handleLoginClick = () => {
    setModalOpen(true);
  };

  // 处理退出登录
  const handleLogout = () => {
    logout();
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setModalOpen(false);
  };

  // 如果正在加载或未挂载，显示加载状态
  if (loading || !mounted) {
    return (
      <div className={`${styles.authButton} ${className || ''}`} style={{ opacity: 0.7 }}>
        <Avatar size={24} icon={<UserOutlined />} />
        <span className={styles.loginText}>加载中...</span>
      </div>
    );
  }

  // 如果已登录，显示用户信息和下拉菜单
  if (isAuthenticated && user) {
    const dropdownItems = [
      {
        key: 'logout',
        label: (
          <Space>
            <LogoutOutlined />
            退出登录
          </Space>
        ),
        onClick: handleLogout,
      },
    ];

    return (
      <>
        <Dropdown
          menu={{ items: dropdownItems }}
          placement="topLeft"
          trigger={['click']}
          overlayClassName={styles.dropdownMenu}
        >
          <button className={`${styles.authButton} ${className || ''}`}>
            <div className={styles.userInfo}>
              <Avatar size={24} icon={<UserOutlined />} />
              <span className={styles.userEmail} title={user.email}>
                {user.email}
              </span>
            </div>
          </button>
        </Dropdown>

        <AuthModal open={modalOpen} onClose={handleCloseModal} />
      </>
    );
  }

  // 如果未登录，显示登录按钮
  return (
    <>
      <button
        className={`${styles.authButton} ${className || ''}`}
        onClick={handleLoginClick}
      >
        <Avatar size={24} icon={<LoginOutlined />} />
        <span className={styles.loginText}>登录</span>
      </button>

      <AuthModal open={modalOpen} onClose={handleCloseModal} />
    </>
  );
}