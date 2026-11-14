/** Admin endpointlarini himoya qiladi: Authorization: Bearer <token>. */
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { loadConfig } from '../config/configuration';
import { verifyToken } from './token';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = String(req.headers['authorization'] || '');
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const payload = verifyToken(token, loadConfig().admin.secret);
    if (!payload) throw new UnauthorizedException({ message: 'Avtorizatsiya kerak' });
    req.admin = payload;
    return true;
  }
}
