import {Injectable, signal} from '@angular/core';
import {Song} from './transcribing.service';

@Injectable({ providedIn: 'root' })
export class AudioPlayerService {

  private audio = new Audio();

  isPlaying = signal(false);
  currentTime = signal(0);
  duration = signal(0);
  currentSong = signal<Song | null>(null);

  constructor() {
    // keep time updated
    this.audio.ontimeupdate = () => {
      this.currentTime.set(this.audio.currentTime);
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
    this.audio.currentTime = 0;
  }

  seek(seconds: number) {
    this.audio.currentTime = seconds;
  }
}
