import {Component, ElementRef, ViewChild} from '@angular/core';
import {Router, RouterModule} from '@angular/router';
import {TranscribingService} from '../../services/transcribing.service';
import {FormsModule} from '@angular/forms';

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
  savedSongs: string[] = [];
  @ViewChild('mp3Input') mp3Input!: ElementRef<HTMLInputElement>;

  constructor(private transcribingService: TranscribingService, private router: Router) {}



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

    // Call your service to upload
    this.transcribingService.uploadSong(formData).subscribe({
      next: (res) => {
        // alert(res.message);
        this.router.navigate(["/transcribing"])
      },
      error: (err: any) => {
        console.error(err);
        alert('Upload failed');
      }
    });
  }
}
