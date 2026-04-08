import { Routes } from '@angular/router';
import {Home} from './home/home';
import {TranscribingPage} from './transcribing-page/transcribing-page';
import {Login} from './auth/login/login';
import {Register} from './auth/register/register';
import {AuthGuard} from './guards/auth.guard';
import {ComingSoon} from './coming-soon/coming-soon';

export const routes: Routes = [
  { path: 'home', component: Home, canActivate: [AuthGuard], title: 'Home Page'},
  { path: 'transcribing', component: TranscribingPage, title: 'Transcribing Page'},
  { path: 'about', component: ComingSoon, title: 'About'},
  { path: 'goals', component: ComingSoon, title: 'Goals'},
  { path: 'login', component: Login, title: 'Login'},
  { path: 'register', component: Register, title: 'Register'},
  { path: '', redirectTo: '/login', pathMatch: 'full'}
];
