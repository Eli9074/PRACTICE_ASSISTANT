import {Component, computed, ElementRef, HostListener, OnInit, QueryList, ViewChild, ViewChildren} from '@angular/core';
import { Song, TranscribingService } from '../services/transcribing.service';
import { AudioPlayerService } from '../services/audio-player.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-transcribing-page',
  imports: [FormsModule],
  templateUrl: './transcribing-page.html',
  styleUrl: './transcribing-page.scss',
})
export class TranscribingPage implements OnInit {

  @ViewChild('playheadScrubber', { static: true })
  playheadScrubber!: ElementRef<HTMLDivElement>;

  @ViewChild('speedScrubber', { static: true })
  speedScrubber!: ElementRef<HTMLDivElement>;


  playheadPercent = 0;   // audio position
  speedPercent = 50;    // centered = normal speed
  dragging: 'playhead' | 'speed' | null = null;

  currentSong = computed(() => this.transcribingService.currentSong());

  constructor(
    private transcribingService: TranscribingService,
    public audioPlayer: AudioPlayerService,
  ) {}

  private animationFrameId: number | null = null;

  ngOnInit() {
    const animate = () => {
      if (this.dragging !== 'playhead' && this.audioPlayer.isPlaying()) {
        this.playheadPercent =
          (this.audioPlayer.getCurrentPercent() ?? 0) * 100;
      }

      this.animationFrameId = requestAnimationFrame(animate);
    };

    animate();
  }

  // ------------------------
  // Scrubber Dragging
  // ------------------------
  startDrag(type: 'playhead' | 'speed', event: MouseEvent) {
    this.dragging = type;
    this.updateFromEvent(type, event);
  }

  @HostListener('document:mousemove', ['$event'])
  onDrag(event: MouseEvent) {
    if (!this.dragging) return;
    this.updateFromEvent(this.dragging, event);
  }

  @HostListener('document:mouseup')
  stopDrag() {
    this.dragging = null;
  }


  private updateFromEvent(type: 'playhead' | 'speed', event: MouseEvent) {
    const el = type === 'playhead'
      ? this.playheadScrubber.nativeElement
      : this.speedScrubber.nativeElement;

    const rect = el.getBoundingClientRect();
    const percent = Math.min(
      Math.max((event.clientX - rect.left) / rect.width, 0),
      1
    );

    if (type === 'playhead') {
      this.playheadPercent = percent * 100;
      this.audioPlayer.seek(percent);
    }
  }




  // ------------------------
  // Click-to-seek
  // ------------------------
  seekTimeline(event: MouseEvent) {
    this.updateFromEvent('playhead', event);
  }

  seekSpeed(event: MouseEvent) {
    this.updateFromEvent('speed', event);
  }

  async onStretchEnter(value: string){
    const speed = parseFloat(value);

    if (isNaN(speed) || speed <= 0) {
      alert("Please enter a valid speed greater than 0");
      return;
    }

    try {
      this.audioPlayer.pause();
      await this.audioPlayer.stretchAndLoadSong(speed);
      this.audioPlayer.play(); // automatically play after stretching
    } catch (err) {
      console.error(err);
      alert("Failed to stretch audio. Make sure a song is loaded.");
    }

}

  ngOnDestroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
