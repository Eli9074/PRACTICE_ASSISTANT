package com.byear.practiceassistant.model;

import jakarta.persistence.*;

@Entity
@Table(name="stems")
public class Stem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String filePath; // path to local MP3

    @ManyToOne
    private User user; // link to uploader

    @ManyToOne
    @JoinColumn(name = "song_id", nullable = false)
    private Song song;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StemType stemType;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Song getSong() {
        return song;
    }

    public void setSong(Song song) {
        this.song = song;
    }

    public StemType getStemType() {
        return stemType;
    }

    public void setStemType(StemType stemType) {
        this.stemType = stemType;
    }
}
