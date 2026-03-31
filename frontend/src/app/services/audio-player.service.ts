import { Injectable, signal } from '@angular/core';
import {Song, TranscribingService} from './transcribing.service';
import * as Tone from 'tone';
import JSZip from "jszip";
import {HttpClient} from '@angular/common/http';



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

  vocalFilePath: string | undefined;
  drumFilePath: string | undefined;
  bassFilePath: string | undefined;
  otherFilePath: string | undefined;
  public isFirstTime: Boolean = true;

  private player: Tone.Player | null = null;
  stemPlayers: { [key: string]: Tone.Player } = {};

  stemMuteState: { [key: string]: boolean } = {
    vocals: false,
    drums: false,
    bass: false,
    other: false
  };

  areStemsReady = signal(false);
  isPlaying = signal(false);
  isLoading = signal(false);
  currentSong = signal<Song | null>(null);
  currentSongId = signal<number | null>(null);
  originalSong = signal<Song | null>(null)
  currentSpeed = signal(1);
  areStemsEnabled = signal(false)

  //This is used to reset the playback when it finishes
  private _timeUpdateEventId: number | null = null;

  constructor(private transcribingService: TranscribingService, private http: HttpClient) {}

  async loadSong(song: Song, stemLoad: boolean, stretchLoad: boolean, initialLoad: boolean) {
    if(initialLoad){
      this.originalFile = song.file;
      this.originalSong.set(song);
    }
    if(!stemLoad && !stretchLoad){
      await this.defaultLoad(song);
      this.createStems()
        .then(() => {

        })
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



    // Reset Transport if restarting
    setInterval(() => {
      if (!this.player) return;
      const elapsed = Tone.Transport.seconds;
      if (elapsed >= this.player.buffer.duration) {
        Tone.Transport.stop();
        Tone.Transport.seconds = 0;
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
        player.unsync?.();  // remove from Transport if it was synced
        player.dispose();    // safely dispose
      });
      this.stemPlayers = {}; // clear the reference
    }
    this.stemPlayers = {};
    // Helper to create a player for a File or URL
    const createStemPlayer = async (file: File, name: string) => {
      if (!file) return;
      const url = URL.createObjectURL(file);
      const player = new Tone.Player(url, () => {
        // Audio is fully loaded
        player.sync().start(0);
        // Auto mute if needed
        player.mute = preserveMuteState ? this.stemMuteState[name] : false;
      }).toDestination();

      this.stemPlayers[name] = player;
    };
    await createStemPlayer(this.vocalFile, "vocals");
    await createStemPlayer(this.drumFile, "drums");
    await createStemPlayer(this.bassFile, "bass");
    await createStemPlayer(this.otherFile, "other");

    if (!preserveMuteState) {
      // Reset mute state to all unmuted on fresh toggle
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

  // ------------------------
  // Core play/pause/seek
  // ------------------------
  play() {
    if (!this.player) return;
    // Start Transport only if it’s not already started
    if (Tone.Transport.state !== "started") {
      Tone.Transport.start();
    }
  }

  pause() {
    // Pause Transport without stopping players
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
    if (!originalSong || !this.originalFile) return;

    const wasPlaying = Tone.Transport.state === "started";
    const currentPosition = Tone.Transport.seconds;
    if(!backgroundLoad){
      this.isLoading.set(true);
      this.pause();
    }

    const formData = new FormData();
    formData.append("speed", speed.toString());
    formData.append("original", this.originalFile);
    formData.append("vocals", this.originalVocalFile!);
    formData.append("drums",  this.originalDrumFile!);
    formData.append("bass",   this.originalBassFile!);
    formData.append("other",  this.originalOtherFile!);

    const res = await fetch("http://localhost:8001/stretch", {
      method: "POST",
      body: formData
    });

    const blob = await res.blob();

    const zip = await JSZip.loadAsync(blob);

    const getStem = async (name: string): Promise<File> => {
      const entry = zip.file(`${name}.wav`);

      if (!entry) {
        throw new Error(`Missing stem: ${name}`);
      }

      const blob = await entry.async("blob");
      return new File([blob], `${name}.wav`, { type: "audio/wav" });
    };

    const stretchedOriginal= await getStem("original")!;
    this.vocalFile = await getStem("vocals")!;
    this.drumFile  = await getStem("drums")!;
    this.bassFile  = await getStem("bass")!;
    this.otherFile = await getStem("other")!;

    const songToLoad = { ...originalSong, file: stretchedOriginal };

    this.currentSpeed.set(speed);
    if (!backgroundLoad) {
      await this.bothLoad(songToLoad, true);
      Tone.Transport.seconds = currentPosition;
      if (wasPlaying) this.play();
      this.isLoading.set(false);
    }
  }

  async stretchSingle(speed: number) {
    const song = this.originalSong();
    if (!song || !this.originalFile) return;

    const wasPlaying = Tone.Transport.state === "started";
    const currentPosition = Tone.Transport.seconds;
    this.pause(); // add this
    this.isLoading.set(true);

    const formData = new FormData();
    formData.append("speed", speed.toString());
    formData.append("file", this.originalFile);

    const res = await fetch("http://localhost:8001/stretch_single", {
      method: "POST",
      body: formData
    });

    const blob = await res.blob();
    const stretchedFile = new File([blob], "stretched.wav", { type: "audio/wav" });
    const songToLoad = { ...song, file: stretchedFile };

    this.currentSpeed.set(speed);
    await this.loadSong(songToLoad, false, true, false);

    Tone.Transport.seconds = currentPosition;
    if (wasPlaying) this.play();
    this.isLoading.set(false);
  }

  async createStems(){
    const song = this.currentSong();
    if (!song) return;

    const file: File = (song as any).file;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const stems = await this.transcribingService.separateAudio(formData);

      this.vocalFilePath = stems["vocals"];
      this.drumFilePath  = stems["drums"];
      this.bassFilePath  = stems["bass"];
      this.otherFilePath = stems["other"];

      this.vocalFile = await this.transcribingService.fetchStemFile(stems["vocals"], "vocals.wav");
      this.drumFile  = await this.transcribingService.fetchStemFile(stems["drums"],  "drums.wav");
      this.bassFile  = await this.transcribingService.fetchStemFile(stems["bass"],   "bass.wav");
      this.otherFile = await this.transcribingService.fetchStemFile(stems["other"],  "other.wav");

      this.originalVocalFile = this.vocalFile;
      this.originalDrumFile  = this.drumFile;
      this.originalBassFile  = this.bassFile;
      this.originalOtherFile = this.otherFile;

      await this.saveStems();
      await this.stretchStems(this.currentSpeed(), true);
      this.areStemsReady.set(true);

    } catch (err) {
      console.error("Error separating audio:", err);
    }

  }

  async saveStems() {
    const song = this.currentSong();
    if (!song) {
      console.error("No song selected!");
      return;
    }

    if (!this.vocalFilePath || !this.drumFilePath || !this.bassFilePath || !this.otherFilePath) {
      console.error("Stem paths are not set!");
      return;
    }

    const body = {
      title: song.title,
      artist: song.artist,
      stems: {
        vocals: this.vocalFilePath,
        drums:  this.drumFilePath,
        bass:   this.bassFilePath,
        other:  this.otherFilePath
      }
    };

    this.transcribingService.saveStemPaths(body).subscribe({
      next: (res) => console.log("Response:", res),
      error: (err) => console.error("Error:", err)
    });
  }

  async loadStems() {
    const songId = this.currentSongId();
    if(!songId){return;}
    try {
      const toFile = async (type: string, filename: string) => {
        const blob = await this.transcribingService.getStemFile(songId, type).toPromise();
        return new File([blob!], filename, { type: "audio/wav" });
      };

      this.vocalFile = await toFile("VOCALS", "vocals.wav");
      this.drumFile  = await toFile("DRUMS",  "drums.wav");
      this.bassFile  = await toFile("BASS",   "bass.wav");
      this.otherFile = await toFile("OTHER",  "other.wav");

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

    // Wait for player to fully load before resolving
    await new Promise<void>((resolve) => {
      this.player = new Tone.Player(audioUrl, () => {
        console.log("Player loaded!");
        this.player?.sync().start(0);
        resolve(); // only resolves once buffer is ready
      }).toDestination();
    });
  }

  async stemLoad(song: Song){
    await this.loadStems().then(() => {
      this.toggleStems();
    })
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






}
