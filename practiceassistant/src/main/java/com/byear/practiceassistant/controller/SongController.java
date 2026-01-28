package com.byear.practiceassistant.controller;

import com.byear.practiceassistant.dto.SongDto;
import com.byear.practiceassistant.model.Song;
import com.byear.practiceassistant.model.User;
import com.byear.practiceassistant.repo.SongRepository;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/songs")
public class SongController {

    private final SongRepository songRepository;
    private final UserRepository userRepository;

    public SongController(SongRepository songRepository, UserRepository userRepository) {
        this.songRepository = songRepository;
        this.userRepository = userRepository;
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
}
