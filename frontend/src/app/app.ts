import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {Home} from './home/home';
import {Header} from './components/header/header';
import {MainContainer} from './components/main-container/main-container';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MainContainer],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend');
}
