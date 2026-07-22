// login.ts
import { Component } from '@angular/core';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
})
export class Login {
  constructor(private auth: AuthService) {}

  loginWithCognito() {
    this.auth.redirectToLogin();
  }
}
