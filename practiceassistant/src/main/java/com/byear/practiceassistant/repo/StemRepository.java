package com.byear.practiceassistant.repo;

import com.byear.practiceassistant.model.Stem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StemRepository extends JpaRepository<Stem,Long> {
    List<Stem> findByUserId(Long userId);
}
