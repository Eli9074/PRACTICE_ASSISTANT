import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {Home} from './home/home';
import {Header} from './components/header/header';
import {MainContainer} from './components/main-container/main-container';
import {RouterModule} from '@angular/router';
import {ArpeggioCenter} from './components/arpeggio-center/arpeggio-center';
import {GoalCenter} from './components/goal-center/goal-center';
import {TranscribingCenter} from './components/transcribing-center/transcribing-center';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterModule, Header],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend');
}
