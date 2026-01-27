import {Component, computed} from '@angular/core';
import {AuthService} from '../../auth/auth.service';
import {AsyncPipe} from '@angular/common';

@Component({
  selector: 'app-header',
  imports: [
    AsyncPipe
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {

  constructor(public auth: AuthService) {}
}
