import {ApplicationConfig, provideBrowserGlobalErrorListeners} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),

    provideHttpClient(
      withInterceptors([
        (req, next) => {
          const token = localStorage.getItem('accessToken');

          if (
            token &&
            req.url.startsWith('/api') &&
            !req.url.startsWith('/api/auth')
          ) {
            req = req.clone({
              setHeaders: {
                Authorization: `Bearer ${token}`
              }
            });
          }

          return next(req);
        }
      ])
    )
  ]
};
