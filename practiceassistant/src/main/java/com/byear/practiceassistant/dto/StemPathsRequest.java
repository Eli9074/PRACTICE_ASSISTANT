package com.byear.practiceassistant.dto;

import java.util.Map;

public class StemPathsRequest {
    private String title;
    private String artist;
    private Map<String, String> stems;

    // getters + setters
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getArtist() { return artist; }
    public void setArtist(String artist) { this.artist = artist; }
    public Map<String, String> getStems() { return stems; }
    public void setStems(Map<String, String> stems) { this.stems = stems; }
}
