import {Component, ElementRef, OnInit, signal, ViewChild} from '@angular/core';
import {Router, RouterModule} from '@angular/router';
import {Song, TranscribingService} from '../../services/transcribing.service';
import {FormsModule} from '@angular/forms';
import {SongDto} from '../../model/SongDto';
import {AudioPlayerService} from '../../services/audio-player.service';

@Component({
  selector: 'app-transcribing-center',
  imports: [RouterModule, FormsModule],
  templateUrl: './transcribing-center.html',
  styleUrl: './transcribing-center.scss',
})
export class TranscribingCenter implements OnInit{
  selectedFile: File | null = null;
  title: string = '';
  artist: string = '';
  savedSongs = signal<SongDto[]>([]);
  @ViewChild('mp3Input') mp3Input!: ElementRef<HTMLInputElement>;

  constructor(private transcribingService: TranscribingService, private router: Router, private audioPlayer: AudioPlayerService) {}

  ngOnInit(): void {
    this.loadSavedSongs();
  }

  loadSavedSongs() {
    this.transcribingService.getSavedSongs().subscribe({
      next: (songs) => {
        this.savedSongs.set(songs);
        console.log(this.savedSongs);
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  uploadSong() {
    if (!this.selectedFile) return alert('Please select a file first');

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('title', this.title);
    formData.append('artist', this.artist);

    this.transcribingService.uploadSong(formData).subscribe({
      next: (res) => {
        const newSong: Song = {
          file: this.selectedFile!,
          title: this.title,
          artist: this.artist
        };

        // Set metadata in TranscribingService
        this.transcribingService.setCurrentSong(newSong);

        // Load file into AudioPlayerService
        const audioUrl = URL.createObjectURL(this.selectedFile!);
        this.audioPlayer.loadSong(newSong, audioUrl);

        // Navigate to the transcribing page
        this.router.navigate(['/transcribing']);
      },
      error: (err: any) => {
        console.error(err);
        alert('Upload failed');
      }
    });
  }

  transcribeFromSavedSongs(songId: number) {
    this.transcribingService.getFileFromSong(songId).subscribe(res => {
      const audioBlob = res.body!;
      const title = res.headers.get('X-Song-Title') ?? '';
      const artist = res.headers.get('X-Song-Artist') ?? '';

      const file = new File([audioBlob], `${title}.mp3`, { type: 'audio/mpeg' });

      const newSong: Song = { file, title, artist };

      // Set metadata in TranscribingService
      this.transcribingService.setCurrentSong(newSong);

      // Load file into AudioPlayerService
      const audioUrl = URL.createObjectURL(file);
      this.audioPlayer.loadSong(newSong, audioUrl);

      // Navigate to the transcribing page
      this.router.navigate(['/transcribing']);
    });
  }
}
