import {Component, ElementRef, HostListener, ViewChild} from '@angular/core';

@Component({
  selector: 'app-player',
  imports: [],
  templateUrl: './player.html',
  styleUrl: './player.scss',
})
export class Player {
  @ViewChild('scrubber', { static: true })
  scrubber!: ElementRef<HTMLDivElement>;

  progress = 0; // 0–100
  private dragging = false;

  seek(event: MouseEvent) {
    this.setProgress(event);
  }

  startDrag(event: MouseEvent) {
    this.dragging = true;
    this.setProgress(event);
  }

  @HostListener('document:mousemove', ['$event'])
  onDrag(event: MouseEvent) {
    if (!this.dragging) return;
    this.setProgress(event);
  }

  @HostListener('document:mouseup')
  stopDrag() {
    this.dragging = false;
  }

  private setProgress(event: MouseEvent) {
    const rect = this.scrubber.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percent = Math.min(Math.max(x / rect.width, 0), 1);

    this.progress = percent * 100;

    // Hook into audio here:
    // this.audio.currentTime = this.audio.duration * percent;
  }

}
