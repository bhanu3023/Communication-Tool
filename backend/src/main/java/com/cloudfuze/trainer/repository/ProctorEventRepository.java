package com.cloudfuze.trainer.repository;

import com.cloudfuze.trainer.entity.ProctorEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProctorEventRepository extends JpaRepository<ProctorEvent, Long> {
    List<ProctorEvent> findBySession_User_IdOrderByCreatedAtDesc(Long userId);
}
