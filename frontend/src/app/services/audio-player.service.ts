import { Injectable, signal } from '@angular/core';
import { Song } from './transcribing.service';
import * as Tone from 'tone';



@Injectable({ providedIn: 'root' })
export class AudioPlayerService {

  private player: Tone.Player | null = null;

  private startTimestamp: number | null = null; // Tone.now() when playback started
  private pausedPercent: number = 0; // 0 = start, 1 = end

  isPlaying = signal(false);
  isLoading = signal(false);
  currentTime = signal(0);
  duration = signal(0);
  currentSong = signal<Song | null>(null);
  speed = signal(1); // normal speed
  private resumeOffset = 0;


  private _timeUpdateInterval: any = null;

  constructor() {}

  async loadSong(song: Song, audioUrl: string, restart: boolean) {
    await Tone.start();

    this.currentSong.set(song);

    // Stop previous player if exists
    if (this.player) {
      // Stop only if it was started
      if (this.isPlaying()) {
        this.pause();
        this.player.stop();
      }
      this.player.dispose();
    }

    // Create new player with a load callback
    this.player = new Tone.Player(audioUrl, () => {
      // This callback fires once the audio buffer is fully loaded
      this.duration.set(this.player?.buffer?.duration ?? 0);
    }).toDestination();

    // Wait for buffer to load by polling
    await new Promise<void>((resolve) => {
      const checkLoaded = () => {
        if (this.player?.buffer?.loaded) {
          resolve();
        } else {
          requestAnimationFrame(checkLoaded);
        }
      };
      checkLoaded();
    });


    this.player.toDestination();
    if(restart){
      // Reset playback tracking
      this.startTimestamp = null;
      this.pausedPercent = 0;           // reset percent
      this.isPlaying.set(false);
      this.currentTime.set(0);          // still bind scrubber to percent
    }

    // Update currentTime signal periodically
    if (this._timeUpdateInterval) clearInterval(this._timeUpdateInterval);
    this._timeUpdateInterval = setInterval(() => {
      if (!this.player || !this.player.buffer || !this.isPlaying()) return;

      const duration = this.player.buffer.duration;
      if (!duration) return;

    // current progress in percent
      let percent = this.pausedPercent;
      if (this.startTimestamp !== null) {
        percent += (Tone.now() - this.startTimestamp) / duration;
      }

    // Clamp to 0–1
      percent = Math.min(percent, 1);

    // End of track
      if (percent >= 1) {
        this.player.stop();
        this.isPlaying.set(false);
        this.currentTime.set(0);
        this.pausedPercent = 0;
        this.startTimestamp = null;
        return;
      }

    // Update currentTime signal (0–1)
      this.currentTime.set(percent);
    }, 100);
  }

  // ------------------------
  // Core play/pause/seek
  // ------------------------
  play() {
    if (!this.player) return;
    if (this.isPlaying()) return;

    const startTime = this.pausedPercent * this.player.buffer.duration;
    this.startTimestamp = Tone.now();
    this.player.start(undefined, startTime);
    this.isPlaying.set(true);
  }

  pause() {
    if (!this.player || !this.isPlaying()) return;

    this.pausedPercent = this.getCurrentPercent();
    this.player.stop();
    this.startTimestamp = null;

    // Update state
    this.isPlaying.set(false);
  }

  restart() {
    if (!this.player) return;

    this.player.stop();
    this.pausedPercent = 0;
    this.startTimestamp = null;
    this.isPlaying.set(false);
    this.currentTime.set(0);
    this.play();
  }

  seek(percent: number) {
    if (!this.player) return;

    const wasPlaying = this.isPlaying();
    if (wasPlaying) this.player.stop();

    // Update pausedPercent
    this.pausedPercent = percent;

    // Reset startTimestamp for interval calculations
    if (wasPlaying) {
      this.startTimestamp = Tone.now();
      const startTime = this.pausedPercent * this.player.buffer!.duration;
      this.player.start(undefined, startTime);
    } else {
      this.startTimestamp = null;
    }
  }


  // ------------------------
  // Helpers
  // ------------------------
  getCurrentPercent(): number {
    if (!this.player || !this.player.buffer) return this.pausedPercent;

    const duration = this.player.buffer.duration;
    if (!this.isPlaying() || this.startTimestamp === null) return this.pausedPercent;

    const elapsedSeconds = Tone.now() - this.startTimestamp;
    return Math.min(this.pausedPercent + elapsedSeconds / duration, 1);
  }

  async stretchAndLoadSong( speed: number) {
    // Build FormData
    const song = this.currentSong();
    if (!song) return;

    this.isLoading.set(true); // START loading

    const file: File = (song as any).file;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('speed', speed.toString());

    try {
      const response = await fetch('http://127.0.0.1:8000/stretch', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to stretch audio");

      // ✅ This will wait until the blob is fully downloaded
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // ✅ Wait for the player to fully load the new audio
      await this.loadSong(song, url, false);

    } catch (err) {
      console.error("Error stretching audio:", err);
    }
    finally {
      this.isLoading.set(false);
    }
  }

  async reloadStems(){

  }


}
