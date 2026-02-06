import {Injectable, signal} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {BehaviorSubject, Observable} from 'rxjs';
import {SongDto} from '../model/SongDto';

//Creates a frontend Song object in a way
export interface Song {
  file: File;
  title: string;
  artist: string;
}

@Injectable({
  providedIn: 'root'
})
export class TranscribingService {
  currentSong = signal<Song | null>(null);

  constructor(private http: HttpClient) {}

  uploadSong(formData: FormData): Observable<any> {
    return this.http.post(`/api/songs/upload`, formData);
  }

  getSavedSongs(): Observable<any> {
    return this.http.get<SongDto[]>(`/api/songs/saved`);
  }

  setCurrentSong(song: Song) {
    this.currentSong.set(song);
  }

  getCurrentSong(): Song | null {
    return this.currentSong();
  }

  getFileFromSong(songId:number){
    return this.http.get(`/api/songs/file/${songId}`, { responseType: 'blob', observe: 'response' })
  }

  async getStemsRegular(formData: FormData){
      const response = await fetch('http://127.0.0.1:8000/seperate', {
        method: 'POST',
        body: formData,
      });
  }

  async getStemsGuitar(formData: FormData){
    const response = await fetch('http://127.0.0.1:8000/seperate_6', {
      method: 'POST',
      body: formData,
    });
  }

}
