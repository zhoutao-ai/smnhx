/**
 * Next.js Middleware — 页面访问追踪
 *
 * 对每个页面请求 fire-and-forget 调用追踪 API。
 * 不处理 API 路由、静态资源、admin 页面。
 *
 * IP 提取由 /api/track/visit 完成（middleware 在 Edge Runtime 中，
 * 无法直接访问 DB）。
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 跳过不需要追踪的路径
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/admin') ||
    pathname === '/favicon.ico' ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Fire-and-forget：不阻塞页面响应
  try {
    const trackUrl = new URL('/api/track/visit', request.url);
    trackUrl.searchParams.set('path', pathname);

    // 传递原始请求头中的 IP 信息
    fetch(trackUrl.toString(), {
      method: 'POST',
      headers: {
        'x-forwarded-for': request.headers.get('x-forwarded-for') ?? '',
        'x-real-ip': request.headers.get('x-real-ip') ?? '',
      },
    }).catch(() => {
      // 静默失败，不影响页面加载
    });
  } catch {
    // 静默失败
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
