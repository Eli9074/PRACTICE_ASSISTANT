import { Component } from '@angular/core';
import {TranscribingCenter} from '../components/transcribing-center/transcribing-center';
import {ArpeggioCenter} from '../components/arpeggio-center/arpeggio-center';
import {GoalCenter} from '../components/goal-center/goal-center';

@Component({
  selector: 'app-home',
  imports: [TranscribingCenter, ArpeggioCenter, GoalCenter],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {

}
