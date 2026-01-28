import {Injectable, signal} from '@angular/core';
import {Song} from './transcribing.service';

@Injectable({ providedIn: 'root' })
export class AudioPlayerService {

  private audio = new Audio();
  private loopStart: number | null = null;
  private loopEnd: number | null = null;

  isPlaying = signal(false);
  currentTime = signal(0);
  duration = signal(0);
  currentSong = signal<Song | null>(null);

  constructor() {
    // keep time updated and restart when looping enabled
    this.audio.ontimeupdate = () => {
      const time = this.audio.currentTime;
      this.currentTime.set(time);

      if (this.loopStart !== null && this.loopEnd !== null) {
        // Prevent playing before loop start
        if (time < this.loopStart) {
          this.audio.currentTime = this.loopStart;
          return;
        }

        // Loop back when reaching loop end
        if (time >= this.loopEnd - 0.05) {
          this.audio.currentTime = this.loopStart;
        }
      }
    };


    this.audio.onloadedmetadata = () => {
      this.duration.set(this.audio.duration);
    };

    this.audio.onended = () => {
      this.isPlaying.set(false);
    };
  }

  loadSong(song: Song, audioUrl: string) {
    this.audio.src = audioUrl;
    this.audio.load();
    this.currentSong.set(song);
    this.isPlaying.set(false);
  }

  play() {
    this.audio.play();
    this.isPlaying.set(true);
  }

  pause() {
    this.audio.pause();
    this.isPlaying.set(false);
  }

  restart() {
    if (this.loopStart !== null) {
      this.audio.currentTime = this.loopStart;
    } else {
      this.audio.currentTime = 0;
    }
  }

  seek(seconds: number) {
    if (this.loopStart !== null && this.loopEnd !== null) {
      seconds = Math.max(this.loopStart, Math.min(seconds, this.loopEnd));
    }

    this.audio.currentTime = seconds;
  }

  setLoop(start: number, end: number) {
    this.loopStart = start;
    this.loopEnd = end;
  }

  clearLoop() {
    this.loopStart = null;
    this.loopEnd = null;
  }

}
