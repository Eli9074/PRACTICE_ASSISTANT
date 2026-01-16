import { Component } from '@angular/core';
import {Header} from '../header/header';
import {Home} from '../../home/home';
import {TranscribingPage} from '../../transcribing-page/transcribing-page';
import {RouterModule} from '@angular/router';

@Component({
  selector: 'app-main-container',
  imports: [Header, Home, TranscribingPage, RouterModule],
  templateUrl: './main-container.html',
  styleUrl: './main-container.scss',
})
export class MainContainer {

}
