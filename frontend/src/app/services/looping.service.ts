import { Injectable, signal, computed } from '@angular/core';
import { AudioPlayerService } from './audio-player.service';

@Injectable({
  providedIn: 'root'
})
export class LoopingService {

  loopingEnabled = signal(false);
  loopStart = signal(0); // seconds
  loopEnd = signal(0);   // seconds
  draggingHandle: 'start' | 'end' | null = null;

  constructor(private audioPlayer: AudioPlayerService) {}

  toggleLoop() {
    this.loopingEnabled.set(!this.loopingEnabled());
    if (this.loopingEnabled()) {
      this.audioPlayer.pause();

      // Initialize loop range if not set
      if (this.loopStart() == null) this.loopStart.set(0);
      this.loopEnd.set(this.audioPlayer.duration() || 0);

      this.audioPlayer.setLoop(this.loopStart(), this.loopEnd());
      this.audioPlayer.seek(this.loopStart());
    } else {
      this.audioPlayer.clearLoop();
    }
  }

  setLoopStart(seconds: number) {
    const clamped = Math.min(seconds, this.loopEnd() - 0.1);
    this.loopStart.set(clamped);
    this.audioPlayer.setLoop(this.loopStart(), this.loopEnd());
    this.audioPlayer.seek(this.loopStart());
  }

  setLoopEnd(seconds: number) {
    const clamped = Math.max(seconds, this.loopStart() + 0.1);
    this.loopEnd.set(clamped);
    this.audioPlayer.setLoop(this.loopStart(), this.loopEnd());
  }

  startDragging(handle: 'start' | 'end') {
    if (!this.loopingEnabled()) return;
    this.draggingHandle = handle;
  }

  stopDragging() {
    this.draggingHandle = null;
  }

  updateFromMouse(percent: number) {
    if (!this.draggingHandle) return;

    const duration = this.audioPlayer.duration();
    if (!duration) return;

    const seconds = percent * duration;

    if (this.draggingHandle === 'start') {
      this.setLoopStart(seconds);
    } else if (this.draggingHandle === 'end') {
      this.setLoopEnd(seconds);
    }
  }

  parseTime(value: string): number {
    const [mm, ss] = value.split(':').map(Number);
    return (mm || 0) * 60 + (ss || 0);
  }

  formatTime(seconds: number): string {
    const mm = Math.floor(seconds / 60);
    const ss = Math.floor(seconds % 60);
    return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  }

  isInvalid(): boolean {
    return this.loopingEnabled() && this.loopStart() >= this.loopEnd();
  }

  get startPercent(): number {
    const duration = this.audioPlayer.duration();
    return duration ? (this.loopStart() / duration) * 100 : 0;
  }

  get endPercent(): number {
    const duration = this.audioPlayer.duration();
    return duration ? (this.loopEnd() / duration) * 100 : 0;
  }

  get fillLeft(): number {
    return this.startPercent;
  }

  get fillWidth(): number {
    const duration = this.audioPlayer.duration();
    if (!duration) return 0;

    const currentTime = this.audioPlayer.currentTime();
    if (!this.loopingEnabled()) return (currentTime / duration) * 100;

    const clampedTime = Math.max(this.loopStart(), Math.min(currentTime, this.loopEnd()));
    return ((clampedTime - this.loopStart()) / duration) * 100;
  }
}
