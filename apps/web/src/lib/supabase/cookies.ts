// Session cookies are HttpOnly: the browser never reads tokens, every auth call goes through
// the server (Server Actions, route handlers, proxy). docs/SECURITY.md 2.2.
export const authCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
} as const;
