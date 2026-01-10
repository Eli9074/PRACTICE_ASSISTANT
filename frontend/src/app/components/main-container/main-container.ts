import { Component } from '@angular/core';
import {Header} from '../header/header';
import {Home} from '../../home/home';

@Component({
  selector: 'app-main-container',
  imports: [Header, Home],
  templateUrl: './main-container.html',
  styleUrl: './main-container.scss',
})
export class MainContainer {

}
