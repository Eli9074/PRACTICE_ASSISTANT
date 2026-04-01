import {Component, computed, ElementRef, HostListener, OnInit, QueryList, ViewChild, ViewChildren} from '@angular/core';
import { Song, TranscribingService } from '../services/transcribing.service';
import { AudioPlayerService } from '../services/audio-player.service';
import { FormsModule } from '@angular/forms';
import {NgClass} from '@angular/common';
import {Tone} from 'tone/build/esm/core/Tone';

@Component({
  selector: 'app-transcribing-page',
  imports: [FormsModule, NgClass],
  templateUrl: './transcribing-page.html',
  styleUrl: './transcribing-page.scss',
})
export class TranscribingPage implements OnInit {

  private isScrubbing = false;
  loopStartInput = '';
  loopEndInput = '';
  private dragging: 'scrub' | 'loopStart' | 'loopEnd' | null = null;
  private readonly MARKER_THRESHOLD = 0.02;

  constructor(
    private transcribingService: TranscribingService,
    public audioPlayer: AudioPlayerService,
  ) {}

  ngOnInit() {

  }

  async onStretchEnter(value: string) {
    const speed = parseFloat(value);
    if (isNaN(speed) || speed <= 0) {
      alert("Please enter a valid speed greater than 0");
      return;
    }

    try {
      await this.audioPlayer.changePlaybackSpeed(speed);
      if (this.audioPlayer.isLooping()) {
        this.loopStartInput = this.formatTime(this.audioPlayer.loopStart());
        this.loopEndInput = this.formatTime(this.audioPlayer.loopEnd());
      }
    } catch (err) {
      console.error(err);
      alert("Failed to stretch audio. Make sure a song is loaded.");
    }
  }

  toggleVocals() { this.audioPlayer.toggleStemMute('vocals'); }
  toggleDrums()  { this.audioPlayer.toggleStemMute('drums');  }
  toggleBass()   { this.audioPlayer.toggleStemMute('bass');   }
  toggleOther()  { this.audioPlayer.toggleStemMute('other');  }

  //SEEK CONTROLS

  // transcribing-page.ts
  seek(event: MouseEvent) {
    const track = event.currentTarget as HTMLElement;
    const rect = track.getBoundingClientRect();
    const percentage = (event.clientX - rect.left) / rect.width;
    this.audioPlayer.seek(percentage);
  }

  onScrubStart(event: MouseEvent) {
    const track = event.currentTarget as HTMLElement;
    const rect = track.getBoundingClientRect();
    const percentage = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);

    if (this.audioPlayer.isLooping()) {
      const startPct = this.audioPlayer.loopStart() / this.audioPlayer.duration;
      const endPct = this.audioPlayer.loopEnd() / this.audioPlayer.duration;

      if (Math.abs(percentage - startPct) < this.MARKER_THRESHOLD) {
        this.dragging = 'loopStart';
        return;
      }
      if (Math.abs(percentage - endPct) < this.MARKER_THRESHOLD) {
        this.dragging = 'loopEnd';
        return;
      }
    }

    this.dragging = 'scrub';
    this.scrubTo(event);
  }

  onScrubMove(event: MouseEvent) {
    if (!this.dragging) return;
    const track = event.currentTarget as HTMLElement;
    const rect = track.getBoundingClientRect();
    const percentage = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    const seconds = percentage * this.audioPlayer.duration;

    if (this.dragging === 'loopStart') {
      if (seconds < this.audioPlayer.loopEnd()) {
        this.audioPlayer.setLoop(seconds, this.audioPlayer.loopEnd());
        this.loopStartInput = this.formatTime(seconds);
      }
    } else if (this.dragging === 'loopEnd') {
      if (seconds > this.audioPlayer.loopStart()) {
        this.audioPlayer.setLoop(this.audioPlayer.loopStart(), seconds);
        this.loopEndInput = this.formatTime(seconds);
      }
    } else {
      this.scrubTo(event);
    }
  }

  onScrubEnd() {
    this.dragging = null;
    this.isScrubbing = false;
  }

  private scrubTo(event: MouseEvent) {
    const track = event.currentTarget as HTMLElement;
    const rect = track.getBoundingClientRect();
    const percentage = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    this.audioPlayer.seek(percentage);
  }

  //LOOPING CONTROLS
  parseTime(value: string): number | null {
    const parts = value.trim().split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10);
      const seconds = parseFloat(parts[1]);
      if (!isNaN(minutes) && !isNaN(seconds)) {
        return minutes * 60 + seconds;
      }
    }
    return null;
  }

  onLoopInputChange() {
    const start = this.parseTime(this.loopStartInput);
    const end = this.parseTime(this.loopEndInput);
    if (start === null || end === null || end <= start) return;

    this.audioPlayer.setLoop(start, end);

    // Reflect clamped values back into inputs
    this.loopStartInput = this.formatTime(this.audioPlayer.loopStart());
    this.loopEndInput = this.formatTime(this.audioPlayer.loopEnd());
  }

  toggleLoop() {
    this.audioPlayer.toggleLoop();
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }




  ngOnDestroy() {
  }
}
