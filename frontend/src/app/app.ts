import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {Home} from './home/home';
import {Header} from './components/header/header';
import {MainContainer} from './components/main-container/main-container';
import {RouterModule} from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MainContainer, RouterModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend');
}
