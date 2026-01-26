import { Component } from '@angular/core';
import {AuthService} from '../auth.service';
import {Router, RouterLink} from '@angular/router';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-register',
  imports: [
    FormsModule,
    RouterLink
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  username = '';
  password = '';
  email = '';
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    this.auth.register(this.username, this.password, this.email).subscribe({
      next: () => this.router.navigate(['/login']),
      error: err => this.error = 'Registration failed'
    });
  }

}
