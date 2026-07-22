// auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getAccessToken();

  const isApiRequest =
    req.url.startsWith(environment.springUrl) ||
    req.url.startsWith(environment.separateUrl);

  console.log('Request URL:', req.url);
  console.log('separateUrl:', environment.separateUrl);
  console.log('isApiRequest:', isApiRequest);
  console.log('token present:', !!token);

  if (token && isApiRequest) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req);
};
