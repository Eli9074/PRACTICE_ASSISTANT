package com.byear.practiceassistant.controller;

import com.byear.practiceassistant.dto.SongDto;
import com.byear.practiceassistant.model.Song;
import com.byear.practiceassistant.model.Stem;
import com.byear.practiceassistant.model.StemType;
import com.byear.practiceassistant.model.User;
import com.byear.practiceassistant.repo.SongRepository;
import com.byear.practiceassistant.repo.StemRepository;
import com.byear.practiceassistant.repo.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.Principal;
import java.util.*;

@RestController
@RequestMapping("/api/songs")
public class SongController {

    private final SongRepository songRepository;
    private final UserRepository userRepository;
    private final StemRepository stemRepository;

    public SongController(SongRepository songRepository, UserRepository userRepository, StemRepository stemRepository) {
        this.songRepository = songRepository;
        this.userRepository = userRepository;
        this.stemRepository = stemRepository;
    }

    private final String UPLOAD_PATH = "/home/flupo/Music/BYEARMUSIC";

    @GetMapping("/saved")
    public ResponseEntity<?> getSavedSongs(Principal principal) {
        User user = userRepository.findByUsername(principal.getName()).orElseThrow();
        List<Song> songs = songRepository.findByUserId(user.getId());
        List<SongDto> songDtos = songs.stream()
                .map(s -> new SongDto(s.getId(), s.getTitle(), s.getArtist()))
                .toList();

        return ResponseEntity.ok(songDtos);

    }


    @PostMapping("/upload")
    public ResponseEntity<?> uploadSong(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam("artist") String artist,
            Principal principal
    ) throws IOException {

        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow();

        // create user folder if it doesn't exist
        Path userDir = Paths.get(UPLOAD_PATH, "user-" + user.getId());
        Files.createDirectories(userDir);

        // save file
        Path filePath = userDir.resolve(Objects.requireNonNull(file.getOriginalFilename()));
        file.transferTo(filePath.toFile());

        // save DB record
        Song song = new Song();
        song.setTitle(title);
        song.setArtist(artist);
        song.setFilePath(filePath.toString());
        song.setUser(user);

        songRepository.save(song);

        Map<String, String> res = new HashMap<>();
        res.put("message", "Song uploaded successfully!");

        return ResponseEntity.ok(res);
    }

    @GetMapping("/file/{songId}")
    public ResponseEntity<byte[]> getSongFile(
            @PathVariable Long songId,
            Principal principal
    ) throws IOException {

        Song song = songRepository.findById(songId).orElseThrow();

        // verify user owns the song
        if (!song.getUser().getUsername().equals(principal.getName())) {
            return ResponseEntity.status(403).build();
        }

        Path path = Paths.get(song.getFilePath());
        byte[] bytes = Files.readAllBytes(path);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "audio/mpeg")
                .header("X-Song-Title", song.getTitle())
                .header("X-Song-Artist", song.getArtist())
                .body(bytes);
    }

    @PostMapping("/uploadStemsRegular")
    public ResponseEntity<?> uploadStemsRegular(
            @RequestParam("files") MultipartFile[] files, // multiple files
            @RequestParam("title") String title,
            @RequestParam("artist") String artist,
            Principal principal
    ) throws IOException {

        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow();

        // base folder for the user (already exists)
        Path userDir = Paths.get(UPLOAD_PATH, "user-" + user.getId());

        // create "Stems" folder inside the user folder
        Path stemsDir = userDir.resolve("Stems");
        Files.createDirectories(stemsDir);

        // sanitize title and artist to make valid folder name
        String safeTitle = title.replaceAll("[^a-zA-Z0-9-_ ]", "_");
        String safeArtist = artist.replaceAll("[^a-zA-Z0-9-_ ]", "_");

        // create "title - artist" folder inside "Stems"
        String songFolderName = safeTitle + " - " + safeArtist;
        Path songDir = stemsDir.resolve(songFolderName);
        Files.createDirectories(songDir);

        Map<String, StemType> stemMap = Map.of(
                "vocals.wav", StemType.VOCALS,
                "bass.wav", StemType.BASS,
                "drums.wav", StemType.DRUMS,
                "piano.wav", StemType.PIANO,
                "guitar.wav", StemType.GUITAR,
                "other.wav", StemType.OTHER
        );

        // iterate files and save each as Stem
        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;

            String originalFileName = Objects.requireNonNull(file.getOriginalFilename()).toLowerCase();
            StemType type = stemMap.getOrDefault(originalFileName, StemType.OTHER);

            Path filePath = songDir.resolve(file.getOriginalFilename());
            file.transferTo(filePath.toFile());
            Song song = songRepository.findByTitle(title);

            Stem stem = new Stem();
            stem.setFilePath(filePath.toString());
            stem.setStemType(type);
            stem.setUser(user);
            stem.setSong(song);

            stemRepository.save(stem);
        }


        Map<String, String> res = new HashMap<>();
        res.put("message", "Stems uploaded successfully!");

        return ResponseEntity.ok(res);
    }
}
