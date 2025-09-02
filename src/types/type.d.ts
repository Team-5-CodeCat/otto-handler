import type { FastifyReply } from 'fastify';

interface ExtendedFastifyReply extends FastifyReply {
  setCookie: (name: string, value: string, options?: any) => FastifyReply;
  clearCookie: (name: string, options?: any) => FastifyReply;
  cookies: Record<string, string>;
}
