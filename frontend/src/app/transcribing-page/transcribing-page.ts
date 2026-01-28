import { Component, computed, ElementRef, HostListener, OnInit, QueryList, ViewChildren } from '@angular/core';
import { Song, TranscribingService } from '../services/transcribing.service';
import { AudioPlayerService } from '../services/audio-player.service';
import { LoopingService } from '../services/looping.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-transcribing-page',
  imports: [FormsModule],
  templateUrl: './transcribing-page.html',
  styleUrl: './transcribing-page.scss',
})
export class TranscribingPage implements OnInit {

  @ViewChildren('scrubber') scrubbers!: QueryList<ElementRef<HTMLDivElement>>;

  progress = [0, 0, 0]; // main scrubber, speed, sensitivity
  draggingIndex: number | null = null;

  currentSong = computed(() => this.transcribingService.currentSong());

  constructor(
    private transcribingService: TranscribingService,
    public audioPlayer: AudioPlayerService,
    public looping: LoopingService
  ) {}

  ngOnInit() {
    // Update main audio scrubber while playing
    setInterval(() => {
      if (!this.draggingIndex && this.audioPlayer.isPlaying()) {
        this.progress[0] = (this.audioPlayer.currentTime() / this.audioPlayer.duration()) * 100 || 0;
      }
    }, 200); // 5 times per second
  }

  // ------------------------
  // Scrubber
  // ------------------------
  startDrag(event: MouseEvent, index: number) {
    this.draggingIndex = index;
    this.setProgress(event, index);
  }

  seek(event: MouseEvent, index: number) {
    this.setProgress(event, index);
  }

  @HostListener('document:mousemove', ['$event'])
  onDrag(event: MouseEvent) {
    if (this.looping.draggingHandle) {
      this.updateLoopFromMouse(event);
      return;
    }

    if (this.draggingIndex === null) return;
    this.setProgress(event, this.draggingIndex);
  }

  @HostListener('document:mouseup')
  stopDrag() {
    if (this.looping.draggingHandle) {
      this.looping.stopDragging();
      return;
    }

    if (this.draggingIndex === 0) {
      const seconds = (this.progress[0] / 100) * this.audioPlayer.duration();
      this.audioPlayer.seek(seconds);
    }

    this.draggingIndex = null;
  }

  private setProgress(event: MouseEvent, index: number) {
    const element = this.scrubbers.toArray()[index].nativeElement;
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percent = Math.min(Math.max(x / rect.width, 0), 1);

    this.progress[index] = percent * 100;

    if (index === 0) {
      const seconds = percent * this.audioPlayer.duration();
      this.audioPlayer.seek(seconds);
    }
  }

  // ------------------------
  // Looping
  // ------------------------
  onLoopToggle() {
    this.looping.toggleLoop();
  }

  onLoopStartChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.looping.setLoopStart(this.looping.parseTime(value));
  }

  onLoopEndChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.looping.setLoopEnd(this.looping.parseTime(value));
  }

  startLoopDrag(event: MouseEvent, handle: 'start' | 'end') {
    this.looping.startDragging(handle);
    event.stopPropagation();
  }

  updateLoopFromMouse(event: MouseEvent) {
    const scrubber = this.scrubbers.toArray()[0].nativeElement;
    const rect = scrubber.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const percent = x / rect.width;
    this.looping.updateFromMouse(percent);
  }

  // ------------------------
  // Scrubber fill & thumb
  // ------------------------
  get scrubberFillLeft(): number {
    return this.looping.fillLeft;
  }

  get scrubberFillWidth(): number {
    return this.looping.fillWidth;
  }

  // ------------------------
  // Loop display
  // ------------------------
  get loopStartDisplay(): string {
    return this.looping.formatTime(this.looping.loopStart());
  }

  get loopEndDisplay(): string {
    return this.looping.formatTime(this.looping.loopEnd());
  }
}
