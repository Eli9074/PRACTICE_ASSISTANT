import { Component } from '@angular/core';
import { TranscribingService } from '../services/transcribing.service';
import { FormsModule } from '@angular/forms';
import { NgFor, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-native-sync-test',
  standalone: true,
  imports: [FormsModule, NgFor, DecimalPipe],
  template: `
    <div style="padding: 2rem;">
      <label>
        Song ID:
        <input type="text" [(ngModel)]="songId" style="width: 300px;" />
      </label>
      <button (click)="loadStems()">Load Stems</button>

      <br /><br />

      <div *ngFor="let name of stemNames">
        {{ name }}: <audio #audioEl [id]="'audio-' + name" controls style="width: 300px;"></audio>
        currentTime: {{ currentTimes[name] | number: '1.3-3' }}
      </div>

      <br />
      <button (click)="playAll()">Play All</button>
      <button (click)="stopAll()">Stop All</button>

      <br /><br />
      <label>
        Speed: {{ speed }}
        <input type="range" min="0.5" max="2" step="0.05" [value]="speed"
               (input)="onSpeedChange($event)" style="width: 300px;" />
      </label>

      <br /><br />
      <button (click)="startDriftLogging()">Start Drift Logging</button>
      <button (click)="stopDriftLogging()">Stop Drift Logging</button>
      <pre>{{ driftLog }}</pre>
    </div>
  `,
})
export class NativeSyncTestComponent {
  songId = '';
  stemNames = ['vocals', 'drums', 'bass', 'other'];
  speed = 1.0;
  currentTimes: { [key: string]: number } = {};
  driftLog = '';
  private driftInterval: any = null;

  constructor(private transcribingService: TranscribingService) {}

  loadStems() {
    this.transcribingService.getStemUrls(this.songId).subscribe(res => {
      for (const name of this.stemNames) {
        const url = res.stems[name];
        if (!url) continue;
        const audioEl = document.getElementById(`audio-${name}`) as HTMLAudioElement;
        audioEl.src = url;
        (audioEl as any).preservesPitch = true;
        (audioEl as any).mozPreservesPitch = true;
        (audioEl as any).webkitPreservesPitch = true;
      }
    });
  }

  playAll() {
    for (const name of this.stemNames) {
      const audioEl = document.getElementById(`audio-${name}`) as HTMLAudioElement;
      audioEl.currentTime = 0;
    }
    for (const name of this.stemNames) {
      const audioEl = document.getElementById(`audio-${name}`) as HTMLAudioElement;
      audioEl.play();
    }
  }

  stopAll() {
    for (const name of this.stemNames) {
      const audioEl = document.getElementById(`audio-${name}`) as HTMLAudioElement;
      audioEl.pause();
    }
  }

  onSpeedChange(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.speed = value;
    for (const name of this.stemNames) {
      const audioEl = document.getElementById(`audio-${name}`) as HTMLAudioElement;
      audioEl.playbackRate = value;
    }
  }

  startDriftLogging() {
    this.driftInterval = setInterval(() => {
      const times = this.stemNames.map(name => {
        const audioEl = document.getElementById(`audio-${name}`) as HTMLAudioElement;
        this.currentTimes[name] = audioEl?.currentTime ?? 0;
        return audioEl?.currentTime ?? 0;
      });
      const maxDrift = Math.max(...times) - Math.min(...times);
      const timestamp = new Date().toLocaleTimeString();
      this.driftLog += `[${timestamp}] vocals=${times[0].toFixed(3)} drums=${times[1].toFixed(3)} bass=${times[2].toFixed(3)} other=${times[3].toFixed(3)} | drift=${(maxDrift * 1000).toFixed(1)}ms\n`;
    }, 5000);
  }

  stopDriftLogging() {
    clearInterval(this.driftInterval);
  }
}
