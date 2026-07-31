import { Injectable, signal } from '@angular/core';
import { Song, TranscribingService } from './transcribing.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AudioPlayerService {

  private vocalFile: File = new File([new Blob()], "vocals.ogg", { type: "audio/ogg" });
  private drumFile: File = new File([new Blob()], "drums.ogg",  { type: "audio/ogg" });
  private bassFile: File = new File([new Blob()], "bass.ogg",   { type: "audio/ogg" });
  private otherFile: File = new File([new Blob()], "other.ogg",  { type: "audio/ogg" });

  private originalFile: File | null = null;

  public isFirstTime: Boolean = true;

  private audioElement: HTMLAudioElement | null = null;
  stemElements: { [key: string]: HTMLAudioElement } = {};
  private _positionInterval: number | null = null;

  // --- Volume (per stem, persists across enable/disable) ---
  private audioContext: AudioContext | null = null;
  private stemSourceNodes: { [key: string]: MediaElementAudioSourceNode } = {};
  private stemGainNodes: { [key: string]: GainNode } = {};
  stemVolume: { [key: string]: number } = {
    vocals: 1,
    drums: 1,
    bass: 1,
    other: 1
  };

  stemMuteState: { [key: string]: boolean } = {
    vocals: false,
    drums: false,
    bass: false,
    other: false
  };

  areStemsReady = signal(false);
  stemLoadingDuration = signal(0);
  isPlaying = signal(false);
  isLoading = signal(false);
  currentSong = signal<Song | null>(null);
  currentSongId = signal<string | null>(null);
  originalSong = signal<Song | null>(null);
  currentSpeed = signal(1);
  areStemsEnabled = signal(false);
  currentPosition = signal(0);
  isLooping = signal(false);
  loopStart = signal(0);
  loopEnd = signal(0);
  private loopStartRatio = 0;
  private loopEndRatio = 0;

  constructor(private transcribingService: TranscribingService, private http: HttpClient) {}

  // ------------------------------------------------------------------
  // Helpers: "active elements" and "leader" abstract over stems vs. single file
  // ------------------------------------------------------------------

  private getActiveElements(): HTMLAudioElement[] {
    if (this.areStemsEnabled() && Object.keys(this.stemElements).length > 0) {
      return Object.values(this.stemElements);
    }
    return this.audioElement ? [this.audioElement] : [];
  }

  private getLeader(): HTMLAudioElement | null {
    if (this.areStemsEnabled() && this.stemElements['vocals']) {
      return this.stemElements['vocals'];
    }
    return this.audioElement;
  }

  get duration(): number {
    return this.getLeader()?.duration ?? 0;
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  // ------------------------------------------------------------------
  // Loading
  // ------------------------------------------------------------------

  async loadSong(song: Song, stemLoad: boolean, stretchLoad: boolean, initialLoad: boolean) {
    this.areStemsReady.set(false);
    if (initialLoad) {
      this.originalFile = song.file;
      this.originalSong.set(song);
      this.isLooping.set(false);
      this.loopStart.set(0);
      this.loopEnd.set(0);
      this.loopStartRatio = 0;
      this.loopEndRatio = 0;
    }

    await this.defaultLoad(song);

    if (stemLoad) {
      await this.stemLoad(song);
    } else if (!stretchLoad) {
      this.createStems()
        .then(() => {})
        .catch(err => console.error("Failed to create stems:", err));
    }
  }

  async defaultLoad(song: Song): Promise<void> {
    this.currentSong.set(song);

    if (this.audioElement) {
      URL.revokeObjectURL(this.audioElement.src);
      this.audioElement.pause();
      this.audioElement.remove();
    }
    this.stopPositionTracking();

    const audioUrl = URL.createObjectURL(song.file);
    this.audioElement = new Audio(audioUrl);
    this.applyPitchPreservation(this.audioElement);

    await new Promise<void>((resolve) => {
      this.audioElement!.addEventListener('loadedmetadata', () => {
        this.stemLoadingDuration.set(this.audioElement!.duration ?? 0);
        resolve();
      }, { once: true });
    });

    this.startPositionTracking();
  }

  private applyPitchPreservation(el: HTMLAudioElement) {
    (el as any).preservesPitch = true;
    (el as any).mozPreservesPitch = true;
    (el as any).webkitPreservesPitch = true;
  }

  // ------------------------------------------------------------------
  // Stems: fetching
  // ------------------------------------------------------------------

  async createStems() {
    const song = this.currentSong();
    const songId = this.currentSongId();
    if (!song || !songId) return;

    const file: File = song.file;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('songId', songId);

    try {
      await firstValueFrom(this.transcribingService.separateAudio(formData));
      const stemUrls = await firstValueFrom(this.transcribingService.getStemUrls(songId));

      this.vocalFile = await firstValueFrom(this.transcribingService.fetchStemFile(stemUrls.stems['vocals'], "vocals.ogg"));
      this.drumFile  = await firstValueFrom(this.transcribingService.fetchStemFile(stemUrls.stems['drums'], "drums.ogg"));
      this.bassFile  = await firstValueFrom(this.transcribingService.fetchStemFile(stemUrls.stems['bass'], "bass.ogg"));
      this.otherFile = await firstValueFrom(this.transcribingService.fetchStemFile(stemUrls.stems['other'], "other.ogg"));

      this.areStemsReady.set(true);
    } catch (err) {
      console.error("Error separating audio:", err);
    }
  }

  async loadStems() {
    const songId = this.currentSongId();
    if (!songId) return;
    try {
      const stemUrls = await firstValueFrom(this.transcribingService.getStemUrls(songId));
      if (!stemUrls.stems || Object.keys(stemUrls.stems).length === 0) {
        throw new Error("No stems found for this song");
      }

      this.vocalFile = await firstValueFrom(this.transcribingService.fetchStemFile(stemUrls.stems['vocals'], "vocals.ogg"));
      this.drumFile  = await firstValueFrom(this.transcribingService.fetchStemFile(stemUrls.stems['drums'], "drums.ogg"));
      this.bassFile  = await firstValueFrom(this.transcribingService.fetchStemFile(stemUrls.stems['bass'], "bass.ogg"));
      this.otherFile = await firstValueFrom(this.transcribingService.fetchStemFile(stemUrls.stems['other'], "other.ogg"));

      this.areStemsReady.set(true);
    } catch (err) {
      console.error("Error loading stems:", err);
      throw err;
    }
  }

  async stemLoad(song: Song) {
    try {
      await this.loadStems();
    } catch (err) {
      console.warn("Stems not found, creating from scratch...", err);
      await this.createStems();
    }
  }

  // ------------------------------------------------------------------
  // Stems: switching modes
  // ------------------------------------------------------------------

  async toggleStems(preserveMuteState: boolean = false) {
    if (!this.areStemsReady()) return;

    const wasPlaying = this.isPlaying();
    const currentTime = this.audioElement?.currentTime ?? 0;
    const currentRate = this.audioElement?.playbackRate ?? this.currentSpeed();

    this.audioElement?.pause();

    // Tear down old stem elements AND their Web Audio nodes
    Object.values(this.stemElements).forEach(el => {
      URL.revokeObjectURL(el.src);
      el.remove();
    });
    Object.values(this.stemSourceNodes).forEach(node => node.disconnect());
    Object.values(this.stemGainNodes).forEach(node => node.disconnect());
    this.stemElements = {};
    this.stemSourceNodes = {};
    this.stemGainNodes = {};

    const files: { [key: string]: File } = {
      vocals: this.vocalFile,
      drums: this.drumFile,
      bass: this.bassFile,
      other: this.otherFile,
    };

    const ctx = this.getAudioContext();

    for (const name of Object.keys(files)) {
      const url = URL.createObjectURL(files[name]);
      const el = new Audio(url);
      this.applyPitchPreservation(el);

      await new Promise<void>((resolve) => {
        el.addEventListener('loadedmetadata', () => resolve(), { once: true });
      });

      el.currentTime = currentTime;
      el.playbackRate = currentRate;
      el.muted = preserveMuteState ? this.stemMuteState[name] : false;

      // Route through a GainNode so volume can go above 100%, not just down to 0
      const source = ctx.createMediaElementSource(el);
      const gainNode = ctx.createGain();
      gainNode.gain.value = this.stemVolume[name] ?? 1;
      source.connect(gainNode).connect(ctx.destination);

      this.stemSourceNodes[name] = source;
      this.stemGainNodes[name] = gainNode;
      this.stemElements[name] = el;
    }

    if (!preserveMuteState) {
      this.stemMuteState = { vocals: false, drums: false, bass: false, other: false };
    }
    // Note: stemVolume is intentionally NOT reset here — it persists across toggles by design.

    this.stopPositionTracking();
    this.areStemsEnabled.set(true);
    this.startPositionTracking();

    if (wasPlaying) this.play();
  }

  toggleBackToMain() {
    const wasPlaying = this.isPlaying();
    const currentTime = this.getLeader()?.currentTime ?? 0;

    Object.values(this.stemElements).forEach(el => el.pause());

    this.areStemsEnabled.set(false);
    this.stopPositionTracking();

    if (this.audioElement) {
      this.audioElement.currentTime = currentTime;
      this.audioElement.playbackRate = this.currentSpeed();
    }

    this.startPositionTracking();

    if (wasPlaying) this.play();
  }

  toggleStemMute(name: string) {
    this.stemMuteState[name] = !this.stemMuteState[name];
    if (this.stemElements[name]) {
      this.stemElements[name].muted = this.stemMuteState[name];
    }
  }

  setStemVolume(name: string, value: number) {
    const clamped = Math.min(Math.max(value, 0), 2);
    this.stemVolume[name] = clamped;
    if (this.stemGainNodes[name]) {
      this.stemGainNodes[name].gain.value = clamped;
    }
  }

  // ------------------------------------------------------------------
  // Playback controls — now operate on "active elements"
  // ------------------------------------------------------------------

  play() {
    const elements = this.getActiveElements();
    if (elements.length === 0) return;
    elements.forEach(el => el.play());
    this.isPlaying.set(true);
  }

  pause() {
    this.getActiveElements().forEach(el => el.pause());
    this.isPlaying.set(false);
  }

  restart() {
    this.pause();
    const target = this.isLooping() ? this.loopStart() : 0;
    this.getActiveElements().forEach(el => el.currentTime = target);
    this.play();
  }

  seek(percentage: number) {
    const duration = this.duration;
    if (!duration) return;

    let seconds = percentage * duration;
    if (this.isLooping() && this.loopEnd() > 0) {
      seconds = Math.min(Math.max(seconds, this.loopStart()), this.loopEnd());
    }

    this.getActiveElements().forEach(el => el.currentTime = seconds);
    this.currentPosition.set(seconds / duration);
  }

  async changePlaybackSpeed(speed: number) {
    this.getActiveElements().forEach(el => el.playbackRate = speed);
    this.currentSpeed.set(speed);
  }

  // ------------------------------------------------------------------
  // Position tracking / looping — reads from the leader, applies to all active
  // ------------------------------------------------------------------

  private startPositionTracking() {
    this.stopPositionTracking();

    this._positionInterval = window.setInterval(() => {
      const leader = this.getLeader();
      if (!leader) return;
      const elapsed = leader.currentTime;
      const duration = leader.duration;
      if (!duration) return;

      this.currentPosition.set(elapsed / duration);

      if (this.isLooping() && this.loopEnd() > 0 && elapsed >= this.loopEnd()) {
        this.getActiveElements().forEach(el => el.currentTime = this.loopStart());
        return;
      }

      if (elapsed >= duration) {
        this.getActiveElements().forEach(el => {
          el.pause();
          el.currentTime = 0;
        });
        this.currentPosition.set(0);
        this.isPlaying.set(false);
      }
    }, 100);
  }

  private stopPositionTracking() {
    if (this._positionInterval) {
      clearInterval(this._positionInterval);
      this._positionInterval = null;
    }
  }

  // ------------------------------------------------------------------
  // Looping
  // ------------------------------------------------------------------

  setLoop(start: number, end: number) {
    const duration = this.duration;
    const clampedStart = Math.max(0, start);
    const clampedEnd = Math.min(end, duration);

    this.loopStart.set(clampedStart);
    this.loopEnd.set(clampedEnd);

    if (duration > 0) {
      this.loopStartRatio = clampedStart / duration;
      this.loopEndRatio = clampedEnd / duration;
    }
  }

  reapplyLoop() {
    if (!this.isLooping() || this.loopEndRatio === 0) return;
    const duration = this.duration;
    this.loopStart.set(this.loopStartRatio * duration);
    this.loopEnd.set(this.loopEndRatio * duration);
  }

  toggleLoop() {
    const newState = !this.isLooping();
    this.isLooping.set(newState);
    if (newState) {
      this.setLoop(0, this.duration);
    }
  }
}
