import { Routes } from '@angular/router';
import { Home } from './home/home';
import { TranscribingPage } from './transcribing-page/transcribing-page';
import { Login } from './auth/login/login';
import { authGuard } from './guards/auth.guard';
import { ComingSoon } from './coming-soon/coming-soon';
import { Callback } from './auth/callback';
import { NativeStretchTestComponent } from "./components/test-htmlmedia";
import {NativeSyncTestComponent} from './components/test-htmlmedia-sync';

export const routes: Routes = [
  { path: 'home', component: Home, canActivate: [authGuard], title: 'Home Page' },
  { path: 'transcribing', component: TranscribingPage, canActivate: [authGuard], title: 'Transcribing Page' },
  { path: 'about', component: ComingSoon, canActivate: [authGuard], title: 'About' },
  { path: 'goals', component: ComingSoon, canActivate: [authGuard], title: 'Goals' },
  { path: 'login', component: Login, title: 'Login' },
  { path: 'callback', component: Callback },
  { path: 'native-test', component: NativeStretchTestComponent },
  { path: 'sync-test', component: NativeSyncTestComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
];
