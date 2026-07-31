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
  private readonly MARKER_THRESHOLD = 0.02;
  private scrubberEl: HTMLElement | null = null;
  private speedScrubberEl: HTMLElement | null = null;

  readonly MIN_SPEED = 0.25;
  readonly MAX_SPEED = 2.0;
  readonly oneXPosition = (1 - 0.25) / (2 - 0.25);

  private dragging: 'scrub' | 'loopStart' | 'loopEnd' | 'speed' | 'stemVolume' | null = null;
  private draggingStemName: string | null = null;
  private volumeScrubberEl: HTMLElement | null = null;

  readonly VOLUME_MIN = 0;
  readonly VOLUME_MAX = 2;

  stemVolumePosition(name: string): number {
    const value = this.audioPlayer.stemVolume[name] ?? 1;
    return (value - this.VOLUME_MIN) / (this.VOLUME_MAX - this.VOLUME_MIN);
  }

  onStemVolumeScrubStart(event: MouseEvent, name: string) {
    this.volumeScrubberEl = event.currentTarget as HTMLElement;
    this.dragging = 'stemVolume';
    this.draggingStemName = name;
    this.applyStemVolumeFromEvent(event);
  }

  private applyStemVolumeFromEvent(event: MouseEvent) {
    if (!this.volumeScrubberEl || !this.draggingStemName) return;
    const rect = this.volumeScrubberEl.getBoundingClientRect();
    const percentage = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    const value = this.VOLUME_MIN + percentage * (this.VOLUME_MAX - this.VOLUME_MIN);
    this.audioPlayer.setStemVolume(this.draggingStemName, value);
  }

  get speedPosition(): number {
    return (this.audioPlayer.currentSpeed() - this.MIN_SPEED) / (this.MAX_SPEED - this.MIN_SPEED);
  }

  constructor(
    private transcribingService: TranscribingService,
    public audioPlayer: AudioPlayerService,
  ) {}

  ngOnInit() {
    if (this.audioPlayer.isFirstTime && !this.audioPlayer.currentSong()) {
      const storedId = sessionStorage.getItem('currentSongId');
      if (storedId) {
        this.transcribingService.getSongFileUrl(storedId).subscribe(res => {
          this.transcribingService.fetchFileFromUrl(res.downloadUrl).subscribe(audioBlob => {
            const file = new File([audioBlob], `${res.title}.mp3`, { type: 'audio/mpeg' });
            const song: Song = { file, title: res.title, artist: res.artist };
            this.transcribingService.setCurrentSong(song);
            this.audioPlayer.currentSongId.set(storedId);
            this.audioPlayer.isFirstTime = false;
            this.audioPlayer.loadSong(song, true, false, true);
          });
        });
      }
    }
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
    this.scrubberEl = event.currentTarget as HTMLElement;
    const rect = this.scrubberEl.getBoundingClientRect();
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

  onSpeedScrubStart(event: MouseEvent) {
    this.speedScrubberEl = event.currentTarget as HTMLElement;
    this.dragging = 'speed';
    this.applySpeedFromEvent(event);
  }

  @HostListener('document:mousemove', ['$event'])
  onScrubMove(event: MouseEvent) {
    if (!this.dragging) return;

    if (this.dragging === 'speed') {
      this.applySpeedFromEvent(event);
      return;
    }

    if (this.dragging === 'stemVolume') {
      this.applyStemVolumeFromEvent(event);
      return;
    }

    if (!this.scrubberEl) return;
    const rect = this.scrubberEl.getBoundingClientRect();
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

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    const tag = target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;

    if (event.code === 'Space') {
      event.preventDefault();
      if (this.audioPlayer.isPlaying()) {
        this.audioPlayer.pause();
      } else {
        this.audioPlayer.play();
      }
    } else if (event.code === 'ArrowLeft') {
      event.preventDefault();
      this.audioPlayer.restart();
    }
  }

  @HostListener('document:mouseup')
  onScrubEnd() {
    this.dragging = null;
    this.isScrubbing = false;
    this.scrubberEl = null;
    this.speedScrubberEl = null;
    this.volumeScrubberEl = null;
    this.draggingStemName = null;
  }

  private applySpeedFromEvent(event: MouseEvent) {
    if (!this.speedScrubberEl) return;
    const rect = this.speedScrubberEl.getBoundingClientRect();
    const percentage = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    const speed = this.MIN_SPEED + percentage * (this.MAX_SPEED - this.MIN_SPEED);
    this.audioPlayer.changePlaybackSpeed(parseFloat(speed.toFixed(2)));
  }

  private scrubTo(event: MouseEvent) {
    if (!this.scrubberEl) return;
    const rect = this.scrubberEl.getBoundingClientRect();
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
        return parseFloat((minutes * 60 + seconds).toFixed(1));
      }
    }
    return null;
  }

  adjustLoop(target: 'start' | 'end', delta: number) {
    const current = target === 'start'
      ? this.parseTime(this.loopStartInput) ?? this.audioPlayer.loopStart()
      : this.parseTime(this.loopEndInput)   ?? this.audioPlayer.loopEnd();
    const adjusted = Math.max(0, parseFloat((current + delta).toFixed(1)));
    if (target === 'start') {
      this.loopStartInput = this.formatTime(adjusted);
    } else {
      this.loopEndInput = this.formatTime(adjusted);
    }
    this.onLoopInputChange();
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
    if (this.audioPlayer.isLooping()) {
      this.loopStartInput = this.formatTime(this.audioPlayer.loopStart());
      this.loopEndInput = this.formatTime(this.audioPlayer.loopEnd());
    }
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toFixed(1).padStart(4, '0');
    return `${m}:${s}`;
  }




  ngOnDestroy() {
  }
}
