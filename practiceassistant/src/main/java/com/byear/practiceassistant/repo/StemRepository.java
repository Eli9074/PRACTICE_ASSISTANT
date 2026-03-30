package com.byear.practiceassistant.repo;

import com.byear.practiceassistant.model.Song;
import com.byear.practiceassistant.model.Stem;
import com.byear.practiceassistant.model.StemType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StemRepository extends JpaRepository<Stem,Long> {
    List<Stem> findByUserId(Long userId);
    List<Stem> findBySong(Song song);
    Stem findBySongIdAndStemType(Long songId, StemType stemType);
}
