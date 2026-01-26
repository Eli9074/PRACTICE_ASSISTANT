import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, tap} from 'rxjs';

interface LoginResponse {
  accessToken: string;
}
//This is creating a singleton instance of this service that is available everywhere in the app
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private tokenKey = 'accessToken';
  private loggedIn = new BehaviorSubject(!!localStorage.getItem(this.tokenKey))

  loggedIn$ = this.loggedIn.asObservable();

  constructor(private http: HttpClient) {}

  login(username: string, password: string) {
    return this.http.post<LoginResponse>('/api/auth/login', { username, password })
      .pipe(
        tap(res => {
          localStorage.setItem(this.tokenKey, res.accessToken);
          this.loggedIn.next(true);
        })
      );
  }

  register(username: string, password: string, email: string) {
    return this.http.post('/api/auth/register', { username, password, email})
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    this.loggedIn.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

}
