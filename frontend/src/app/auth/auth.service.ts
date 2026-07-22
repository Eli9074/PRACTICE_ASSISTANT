import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';

interface TokenResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private accessTokenKey = 'accessToken';
  private idTokenKey = 'idToken';
  private refreshTokenKey = 'refreshToken';

  private loggedIn = new BehaviorSubject<boolean>(!!localStorage.getItem(this.accessTokenKey));
  loggedIn$ = this.loggedIn.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  /** Redirects the browser to Cognito's Hosted UI login page */
  redirectToLogin() {
    const params = new HttpParams()
      .set('client_id', environment.cognito.clientId)
      .set('response_type', 'code')
      .set('scope', environment.cognito.scope)
      .set('redirect_uri', environment.cognito.redirectUri);

    window.location.href = `${environment.cognito.domain}/login?${params.toString()}`;
  }

  /** Exchanges an authorization code (from the /callback redirect) for tokens */
  exchangeCodeForTokens(code: string) {
    const body = new HttpParams()
      .set('grant_type', 'authorization_code')
      .set('client_id', environment.cognito.clientId)
      .set('code', code)
      .set('redirect_uri', environment.cognito.redirectUri);

    return this.http.post<TokenResponse>(
      `${environment.cognito.domain}/oauth2/token`,
      body.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    ).pipe(
      tap(res => {
        localStorage.setItem(this.accessTokenKey, res.access_token);
        localStorage.setItem(this.idTokenKey, res.id_token);
        localStorage.setItem(this.refreshTokenKey, res.refresh_token);
        this.loggedIn.next(true);
      })
    );
  }

  logout() {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.idTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    this.loggedIn.next(false);

    const params = new HttpParams()
      .set('client_id', environment.cognito.clientId)
      .set('logout_uri', environment.cognito.logoutRedirectUri);

    window.location.href = `${environment.cognito.domain}/logout?${params.toString()}`;
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }
}
