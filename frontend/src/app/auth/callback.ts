// callback.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-callback',
  standalone: true,
  template: `<p class="text-center pt-5">Logging you in...</p>`,
})
export class Callback implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit() {
    const code = this.route.snapshot.queryParamMap.get('code');

    if (!code) {
      this.router.navigate(['/login']);
      return;
    }

    this.auth.exchangeCodeForTokens(code).subscribe({
      next: () => this.router.navigate(['/home']),
      error: (err: unknown) => {
        console.error('Token exchange failed:', err);
        this.router.navigate(['/login']);
      }
    });
  }
}
