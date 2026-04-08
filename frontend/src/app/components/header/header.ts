import {Component, computed} from '@angular/core';
import {AuthService} from '../../auth/auth.service';
import {AsyncPipe} from '@angular/common';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [
    AsyncPipe,
    RouterLink
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {

  constructor(public auth: AuthService) {}
}
