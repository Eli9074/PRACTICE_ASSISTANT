import { Routes } from '@angular/router';
import {Home} from './home/home';
import {TranscribingPage} from './transcribing-page/transcribing-page';

export const routes: Routes = [
  {
    path: '',
    component: Home,
    title: 'Home Page'
  },
  {
    path: 'transcribing',
    component: TranscribingPage,
    title: 'Transcribing Page'
  }
];
