import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { SongDto } from '../model/SongDto';
import { environment } from '../../environments/environment';

export interface Song {
  file: File;
  title: string;
  artist: string;
}

interface UploadRequestResponse {
  songId: string;
  uploadUrl: string;
  s3Key: string;
}

interface SongFileResponse {
  title: string;
  artist: string;
  downloadUrl: string;
}

interface StemUrlsResponse {
  stems: { [key: string]: string };
}

interface StretchResponse {
  [key: string]: string; // e.g. { original: "url", vocals: "url", drums: "url", ... }
}

@Injectable({
  providedIn: 'root'
})
export class TranscribingService {
  currentSong = signal<Song | null>(null);
  private apiUrl = environment.springUrl;

  constructor(private http: HttpClient) {}

  // ------------------------
  // Songs
  // ------------------------

  getSavedSongs(): Observable<SongDto[]> {
    return this.http.get<SongDto[]>(`${this.apiUrl}/api/songs/saved`);
  }

  setCurrentSong(song: Song) {
    this.currentSong.set(song);
  }

  getCurrentSong(): Song | null {
    return this.currentSong();
  }

  // ------------------------
  // Upload flow (presigned URL, 3 steps)
  // ------------------------

  requestUpload(contentType: string): Observable<UploadRequestResponse> {
    return this.http.post<UploadRequestResponse>(
      `${this.apiUrl}/api/songs/upload-request`,
      { contentType }
    );
  }

  uploadFileToS3(uploadUrl: string, file: File): Observable<any> {
    return this.http.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type }
    });
  }

  completeUpload(songId: string, title: string, artist: string, s3Key: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/songs/upload-complete`, {
      songId, title, artist, s3Key
    });
  }

  // ------------------------
  // Get song file (presigned GET URL)
  // ------------------------

  getSongFileUrl(songId: number | string): Observable<SongFileResponse> {
    return this.http.get<SongFileResponse>(`${this.apiUrl}/api/songs/${songId}/file`);
  }

  /** Fetches the actual audio bytes from a presigned S3 URL */
  fetchFileFromUrl(downloadUrl: string): Observable<Blob> {
    return this.http.get(downloadUrl, { responseType: 'blob' });
  }

  // ------------------------
  // Stems
  // ------------------------

  saveStemPaths(songId: string, stems: { [key: string]: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/songs/${songId}/stems`, { stems });
  }

  getStemUrls(songId: string): Observable<StemUrlsResponse> {
    return this.http.get<StemUrlsResponse>(`${this.apiUrl}/api/songs/${songId}/stems`);
  }

  // ------------------------
  // GPU instance (separate/stretch)
  // ------------------------

  separateAudio(formData: FormData): Observable<{ [key: string]: string }> {
    return this.http.post<{ [key: string]: string }>(
      `${environment.separateUrl}/separate`,
      formData
    );
  }

  fetchStemFile(url: string, filename: string): Observable<File> {
    return this.http.get(url, { responseType: 'blob' }).pipe(
      map(blob => new File([blob], filename, { type: 'audio/ogg' }))
    );
  }

  stretchStems(songId: string, speed: number): Observable<StretchResponse> {
    return this.http.post<StretchResponse>(`${environment.stretchUrl}/stretch`, { songId, speed });
  }

  stretchSingle(songId: string, speed: number): Observable<StretchResponse> {
    return this.http.post<StretchResponse>(`${environment.stretchUrl}/stretch_single`, { songId, speed });
  }
}
