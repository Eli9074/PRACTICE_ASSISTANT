import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Song, TranscribingService } from '../../services/transcribing.service';
import { FormsModule } from '@angular/forms';
import { SongDto } from '../../model/SongDto';
import { AudioPlayerService } from '../../services/audio-player.service';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-transcribing-center',
  imports: [RouterModule, FormsModule],
  templateUrl: './transcribing-center.html',
  styleUrl: './transcribing-center.scss',
})
export class TranscribingCenter {
  selectedFile: File | null = null;
  title: string = '';
  artist: string = '';
  savedSongs = signal<SongDto[]>([]);
  @ViewChild('mp3Input') mp3Input!: ElementRef<HTMLInputElement>;

  constructor(
    private transcribingService: TranscribingService,
    private router: Router,
    private audioPlayer: AudioPlayerService
  ) {}

  get truncatedFileName(): string {
    const name = this.selectedFile?.name;
    if (!name) return 'None';
    return name.length > 10 ? name.slice(0, 10) + '...' : name;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  uploadSong() {
    if (!this.selectedFile) return alert('Please select a file first');

    const file = this.selectedFile;
    const contentType = file.type || 'audio/mpeg';

    let songId: string;
    let s3Key: string;

    this.transcribingService.requestUpload(contentType).pipe(
      switchMap(uploadRequest => {
        songId = uploadRequest.songId;
        s3Key = uploadRequest.s3Key;
        return this.transcribingService.uploadFileToS3(uploadRequest.uploadUrl, file);
      }),
      switchMap(() =>
        this.transcribingService.completeUpload(songId, this.title, this.artist, s3Key)
      )
    ).subscribe({
      next: () => {
        const newSong: Song = { file, title: this.title, artist: this.artist };

        this.transcribingService.setCurrentSong(newSong);
        this.audioPlayer.currentSongId.set(songId);
        this.audioPlayer.loadSong(newSong, false, false, true);

        this.router.navigate(['/transcribing']);
      },
      error: (err) => {
        console.error(err);
        alert('Upload failed');
      }
    });
  }
}
