import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../services/api.models';
import { SessionService } from '../services/session.service';

export const roleGuard: CanActivateFn = route => {
  const session = inject(SessionService);
  const router = inject(Router);
  const roles = route.pathFromRoot.flatMap(part => (part.data['roles'] as Role[] | undefined) ?? []);
  if (session.role === null) return router.createUrlTree(['/login']);
  return roles.includes(session.role) || router.parseUrl(session.home);
};
