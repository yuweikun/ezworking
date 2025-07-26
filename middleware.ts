import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

/**
 * Next.js 中间件 - 处理API路由的认证
 * 这个中间件会在API请求到达路由处理器之前运行
 */
export async function middleware(request: NextRequest) {
  // 只对需要认证的API路由应用中间件
  const protectedPaths = [
    "/api/sessions",
    "/api/messages",
    // '/api/ai/stream'
  ];

  const pathname = request.nextUrl.pathname;

  // 检查是否是受保护的路径
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  // 如果不是受保护的路径，直接通过
  if (!isProtectedPath) {
    return NextResponse.next();
  }

  // 对于受保护的路径，检查认证状态
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "AUTHENTICATION_REQUIRED",
          message: "需要认证令牌",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // 提取令牌
    let token = authHeader;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    // 验证令牌
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "INVALID_TOKEN",
          message: "无效的认证令牌",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // 将用户信息添加到请求头中，供API路由使用
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", user.id);
    requestHeaders.set("x-user-email", user.email || "");

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error("Middleware authentication error:", error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: "AUTHENTICATION_ERROR",
        message: "认证过程中发生错误",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

/**
 * 配置中间件匹配的路径
 */
export const config = {
  matcher: [
    /*
     * 匹配需要认证的API路由:
     * - /api/sessions/*
     * - /api/messages/*
     * - /api/ai/*
     */
    "/api/sessions/:path*",
    "/api/messages/:path*",
    "/api/ai/:path*",
  ],
};
