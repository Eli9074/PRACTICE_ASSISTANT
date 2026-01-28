import {Component, computed, ElementRef, HostListener, OnInit, QueryList, ViewChild, ViewChildren} from '@angular/core';
import {Song, TranscribingService} from '../services/transcribing.service';
import {AudioPlayerService} from '../services/audio-player.service';


@Component({
  selector: 'app-transcribing-page',
  imports: [],
  templateUrl: './transcribing-page.html',
  styleUrl: './transcribing-page.scss',
})
export class TranscribingPage implements OnInit{

  constructor(private transcribingService: TranscribingService, public audioPlayer: AudioPlayerService) {}
  currentSong= computed(() => this.transcribingService.currentSong())

  @ViewChildren('scrubber') scrubbers!: QueryList<ElementRef<HTMLDivElement>>;
  progress = [0,0,0]; // 0–100
  private dragging = false;
  draggingIndex: number | null = null;

  ngOnInit() {
    // Update main audio scrubber while playing
    setInterval(() => {
      if (!this.draggingIndex && this.audioPlayer.isPlaying()) {
        // progress[0] is the main audio scrubber
        this.progress[0] = (this.audioPlayer.currentTime() / this.audioPlayer.duration()) * 100 || 0;
      }
    }, 200); // 5 times per second
  }


  startDrag(event: MouseEvent, index: number) {
    this.draggingIndex = index;
    this.setProgress(event, index);
  }

  seek(event: MouseEvent, index: number) {
    this.setProgress(event, index);
  }

  @HostListener('document:mousemove', ['$event'])
  onDrag(event: MouseEvent) {
    if (this.draggingIndex === null) return;
    this.setProgress(event, this.draggingIndex);
  }

  @HostListener('document:mouseup')
  stopDrag() {
    if (this.draggingIndex !== null) {
      if (this.draggingIndex === 0) {
        // main audio scrubber → update actual audio
        const seconds = (this.progress[0] / 100) * this.audioPlayer.duration();
        this.audioPlayer.seek(seconds);
      }
      // For speed or sensitivity scrubbers, you can add logic here if needed
    }
    this.draggingIndex = null;
  }

  private setProgress(event: MouseEvent, index: number) {
    const element = this.scrubbers.toArray()[index].nativeElement;
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percent = Math.min(Math.max(x / rect.width, 0), 1);

    this.progress[index] = percent * 100;

    if (this.draggingIndex === 0) {
      // update audio live while dragging main scrubber
      const seconds = percent * this.audioPlayer.duration();
      this.audioPlayer.seek(seconds);
    }
  }

}
