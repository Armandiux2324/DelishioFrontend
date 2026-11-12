import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import axios from 'axios';
import { Role } from '../services/api.models';
import { ApiService } from '../services/api.service';
import { SessionService } from '../services/session.service';

export const authGuard: CanActivateFn = async route => {
  const api = inject(ApiService);
  const session = inject(SessionService);
  const router = inject(Router);
  const token = session.token;
  if (!token) return router.createUrlTree(['/login']);
  try {
    const { data: user } = await api.getUser();
    if (session.token !== token) return router.createUrlTree(['/login']);
    session.start({ access_token: token, user });
    if (session.role === null) {
      session.clear();
      return router.createUrlTree(['/login']);
    }
    const roles = route.data['roles'] as Role[];
    return roles.includes(session.role) || router.parseUrl(session.home);
  } catch (error) {
    if (axios.isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) {
      if (session.token === token) session.clear();
      return session.token === null ? router.createUrlTree(['/login']) : false;
    }
    return false;
  }
};
