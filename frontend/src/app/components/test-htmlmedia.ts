import { Component } from '@angular/core';

@Component({
  selector: 'app-native-stretch-test',
  standalone: true,
  template: `
    <div style="padding: 2rem;">
      <input type="file" (change)="onFileSelected($event)" accept="audio/*" />
      <br /><br />
      <audio #audioEl controls style="width: 400px;"></audio>
      <br /><br />
      <label>
        Speed: {{ speed }}
        <input type="range" min="0.5" max="2" step="0.05" [value]="speed"
               (input)="onSpeedChange($event)" style="width: 300px;" />
      </label>
      <br /><br />
      <label>
        <input type="checkbox" [checked]="preservePitch" (change)="onPitchToggle($event)" />
        Preserve pitch (uncheck for "chipmunk" comparison)
      </label>
    </div>
  `,
})
export class NativeStretchTestComponent {
  speed = 1.0;
  preservePitch = true;
  private audioElement: HTMLAudioElement | null = null;

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const audioEl = document.querySelector('audio') as HTMLAudioElement;
    this.audioElement = audioEl;
    audioEl.src = URL.createObjectURL(file);
    (audioEl as any).preservesPitch = this.preservePitch;
    (audioEl as any).mozPreservesPitch = this.preservePitch;
    (audioEl as any).webkitPreservesPitch = this.preservePitch;
  }

  onSpeedChange(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.speed = value;
    if (this.audioElement) {
      this.audioElement.playbackRate = value;
    }
  }

  onPitchToggle(event: Event) {
    this.preservePitch = (event.target as HTMLInputElement).checked;
    if (this.audioElement) {
      (this.audioElement as any).preservesPitch = this.preservePitch;
      (this.audioElement as any).mozPreservesPitch = this.preservePitch;
      (this.audioElement as any).webkitPreservesPitch = this.preservePitch;
    }
  }
}
