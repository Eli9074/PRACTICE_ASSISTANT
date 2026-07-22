import { Injectable, signal } from '@angular/core';
import { Song, TranscribingService } from './transcribing.service';
import * as Tone from 'tone';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AudioPlayerService {

  private vocalFile: File = new File([new Blob()], "vocals.wav", { type: "audio/wav" });
  private drumFile: File = new File([new Blob()], "drums.wav",  { type: "audio/wav" });
  private bassFile: File = new File([new Blob()], "bass.wav",   { type: "audio/wav" });
  private guitarFile: File = new File([new Blob()], "guitar.wav",  { type: "audio/wav" });
  private otherFile: File = new File([new Blob()], "other.wav",  { type: "audio/wav" });

  private originalFile: File | null = null;
  private originalVocalFile: File | null = null;
  private originalDrumFile: File | null = null;
  private originalBassFile: File | null = null;
  private originalOtherFile: File | null = null;

  public isFirstTime: Boolean = true;

  public player: Tone.Player | null = null;
  stemPlayers: { [key: string]: Tone.Player } = {};

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
  originalSong = signal<Song | null>(null)
  currentSpeed = signal(1);
  areStemsEnabled = signal(false)
  currentPosition = signal(0);
  isLooping = signal(false);
  loopStart = signal(0);
  loopEnd = signal(0);
  private loopStartRatio = 0;
  private loopEndRatio = 0;

  private _timeUpdateEventId: number | null = null;

  constructor(private transcribingService: TranscribingService, private http: HttpClient) {}

  get duration(): number {
    return this.player?.buffer?.duration ?? 0;
  }

  async loadSong(song: Song, stemLoad: boolean, stretchLoad: boolean, initialLoad: boolean) {
    this.areStemsReady.set(false);
    if(initialLoad){
      this.originalFile = song.file;
      this.originalSong.set(song);
      this.isLooping.set(false);
      this.loopStart.set(0);
      this.loopEnd.set(0);
      this.loopStartRatio = 0;
      this.loopEndRatio = 0;
    }
    if(!stemLoad && !stretchLoad){
      await this.defaultLoad(song);
      this.createStems()
        .then(() => {})
        .catch(err => {
          console.error("Failed to create stems:", err);
        });
    }
    else if(stemLoad && !stretchLoad){
      await this.defaultLoad(song);
      await this.stemLoad(song);
    }
    else if(stretchLoad && !stemLoad){
      await this.stretchLoad(song);
    }
    else{
      await this.bothLoad(song);
    }

    setInterval(() => {
      if (!this.player) return;
      const elapsed = Tone.Transport.seconds;
      const duration = this.player.buffer.duration;

      this.currentPosition.set(elapsed / duration);

      if (this.isLooping() && this.loopEnd() > 0 && elapsed >= this.loopEnd()) {
        Tone.Transport.seconds = this.loopStart();
        return;
      }

      if (elapsed >= duration) {
        Tone.Transport.stop();
        Tone.Transport.seconds = 0;
        this.currentPosition.set(0);
        this.isPlaying.set(false);
      }
    }, 100);
  }

  async toggleStems(preserveMuteState: boolean = false) {
    if (!this.areStemsReady()) return;

    if (this.player) {
      this.player.mute = true;
    }
    if (this.stemPlayers) {
      Object.values(this.stemPlayers).forEach(player => {
        player.unsync?.();
        player.dispose();
      });
      this.stemPlayers = {};
    }
    this.stemPlayers = {};

    const createStemPlayer = async (file: File, name: string) => {
      if (!file) return;
      const url = URL.createObjectURL(file);
      const player = new Tone.Player(url, () => {
        player.sync().start(0);
        player.mute = preserveMuteState ? this.stemMuteState[name] : false;
      }).toDestination();

      this.stemPlayers[name] = player;
    };
    await createStemPlayer(this.vocalFile, "vocals");
    await createStemPlayer(this.drumFile, "drums");
    await createStemPlayer(this.bassFile, "bass");
    await createStemPlayer(this.otherFile, "other");

    if (!preserveMuteState) {
      this.stemMuteState = { vocals: false, drums: false, bass: false, other: false };
    }

    this.areStemsEnabled.set(true);
  }

  toggleStemMute(name: string) {
    this.stemMuteState[name] = !this.stemMuteState[name];
    if (this.stemPlayers[name]) {
      this.stemPlayers[name].mute = this.stemMuteState[name];
    }
  }

  toggleBackToMain() {
    if (this.stemPlayers) {
      Object.values(this.stemPlayers).forEach(player => {
        player.unsync?.();
        player.dispose();
      });
      this.stemPlayers = {};
    }

    if (this.player) {
      this.player.unsync();
      this.player.mute = false;
      this.player.sync().start(0);
    }

    this.areStemsEnabled.set(false);
  }

  play() {
    if (!this.player) return;
    if (Tone.Transport.state !== "started") {
      Tone.Transport.start();
    }
  }

  pause() {
    if (Tone.Transport.state === "started") {
      Tone.Transport.pause();
    }
  }

  restart() {
    this.pause();
    Tone.Transport.stop();
    Tone.Transport.seconds = 0;
    this.play()
  }

  async stretchStems(speed: number, backgroundLoad: boolean) {
    const originalSong = this.originalSong();
    const songId = this.currentSongId();
    if (!originalSong || !songId) return;

    const wasPlaying = Tone.Transport.state === "started";
    const currentPosition = Tone.Transport.seconds;
    if (!backgroundLoad) {
      this.isLoading.set(true);
      this.pause();
    }

    const urls = await firstValueFrom(this.transcribingService.stretchStems(songId, speed));

    const fetchAsFile = async (url: string, filename: string) =>
      firstValueFrom(this.transcribingService.fetchStemFile(url, filename));

    const stretchedOriginal = await fetchAsFile(urls['original'], "original.wav");
    this.vocalFile = await fetchAsFile(urls['vocals'], "vocals.wav");
    this.drumFile  = await fetchAsFile(urls['drums'], "drums.wav");
    this.bassFile  = await fetchAsFile(urls['bass'], "bass.wav");
    this.otherFile = await fetchAsFile(urls['other'], "other.wav");

    const songToLoad = { ...originalSong, file: stretchedOriginal };

    this.currentSpeed.set(speed);
    if (!backgroundLoad) {
      await this.bothLoad(songToLoad, true);
      this.reapplyLoop();
      Tone.Transport.seconds = this.isLooping()
        ? this.loopStartRatio * this.duration
        : currentPosition;
      if (wasPlaying) this.play();
      this.isLoading.set(false);
    }
  }

  async stretchSingle(speed: number) {
    const song = this.originalSong();
    const songId = this.currentSongId();
    if (!song || !songId) return;

    const wasPlaying = Tone.Transport.state === "started";
    const currentPosition = Tone.Transport.seconds;
    this.pause();
    this.isLoading.set(true);

    const urls = await firstValueFrom(this.transcribingService.stretchSingle(songId, speed));
    const stretchedFile = await firstValueFrom(
      this.transcribingService.fetchStemFile(urls['original'], "stretched.wav")
    );
    const songToLoad = { ...song, file: stretchedFile };

    this.currentSpeed.set(speed);

    await this.loadSong(songToLoad, false, true, false);
    this.reapplyLoop();
    Tone.Transport.seconds = this.isLooping()
      ? this.loopStartRatio * this.duration
      : currentPosition;
    if (wasPlaying) this.play();
    this.isLoading.set(false);
  }

  async createStems(){
    const song = this.currentSong();
    const songId = this.currentSongId();
    if (!song || !songId) return;

    const file: File = song.file;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('songId', songId);

    try {
      // GPU instance separates the audio AND writes stems to S3 + DynamoDB directly
      await firstValueFrom(this.transcribingService.separateAudio(formData));

      // fetch presigned URLs for the stems it just saved
      const stemUrls = await firstValueFrom(this.transcribingService.getStemUrls(songId));

      this.vocalFile = await firstValueFrom(this.transcribingService.fetchStemFile(stemUrls.stems['vocals'], "vocals.wav"));
      this.drumFile  = await firstValueFrom(this.transcribingService.fetchStemFile(stemUrls.stems['drums'], "drums.wav"));
      this.bassFile  = await firstValueFrom(this.transcribingService.fetchStemFile(stemUrls.stems['bass'], "bass.wav"));
      this.otherFile = await firstValueFrom(this.transcribingService.fetchStemFile(stemUrls.stems['other'], "other.wav"));

      this.originalVocalFile = this.vocalFile;
      this.originalDrumFile  = this.drumFile;
      this.originalBassFile  = this.bassFile;
      this.originalOtherFile = this.otherFile;

      if (this.currentSpeed() !== 1) {
        await this.stretchStems(this.currentSpeed(), true);
      }
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

      this.vocalFile = await firstValueFrom(this.transcribingService.fetchStemFile(stemUrls.stems['vocals'], "vocals.wav"));
      this.drumFile  = await firstValueFrom(this.transcribingService.fetchStemFile(stemUrls.stems['drums'], "drums.wav"));
      this.bassFile  = await firstValueFrom(this.transcribingService.fetchStemFile(stemUrls.stems['bass'], "bass.wav"));
      this.otherFile = await firstValueFrom(this.transcribingService.fetchStemFile(stemUrls.stems['other'], "other.wav"));

      this.originalVocalFile = this.vocalFile;
      this.originalDrumFile  = this.drumFile;
      this.originalBassFile  = this.bassFile;
      this.originalOtherFile = this.otherFile;

      console.log("Stems loaded successfully");
      this.areStemsReady.set(true);

    } catch (err) {
      console.error("Error loading stems:", err);
      throw err;
    }
  }

  async defaultLoad(song: Song): Promise<void> {
    this.currentSong.set(song);

    if (this.player?.buffer) {
      URL.revokeObjectURL((this.player.buffer as any)?.url);
    }

    const audioUrl = URL.createObjectURL(song.file);
    await Tone.start();

    if (this.player) {
      this.player.unsync();
      this.player.dispose();
    }

    await new Promise<void>((resolve) => {
      this.player = new Tone.Player(audioUrl, () => {
        console.log("Player loaded!");
        this.player?.sync().start(0);
        this.stemLoadingDuration.set(this.player?.buffer?.duration ?? 0);
        resolve();
      }).toDestination();
    });
  }

  async stemLoad(song: Song){
    try {
      await this.loadStems();
      this.toggleStems();
    } catch (err) {
      console.warn("Stems not found, creating from scratch...", err);
      await this.createStems();
    }
  }

  async stretchLoad(song: Song) {
    await this.defaultLoad(song);
  }

  async bothLoad(song: Song, preserveMuteState: boolean = false){
    await this.defaultLoad(song);
    if(this.areStemsEnabled()){
      await this.toggleStems(preserveMuteState);
    }
  }

  async changePlaybackSpeed(speed: number){
    if(!this.areStemsReady()){
      await this.stretchSingle(speed);
    }
    else{
      await this.stretchStems(speed, false);
    }
  }

  seek(percentage: number) {
    const duration = this.player?.buffer?.duration;
    if (!duration) return;

    let seconds = percentage * duration;

    if (this.isLooping() && this.loopEnd() > 0) {
      seconds = Math.min(Math.max(seconds, this.loopStart()), this.loopEnd());
    }

    Tone.Transport.seconds = seconds;
    this.currentPosition.set(seconds / duration);
  }

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
    if (newState && this.loopStart() > 0) {
      Tone.Transport.seconds = this.loopStart();
    }
  }
}
