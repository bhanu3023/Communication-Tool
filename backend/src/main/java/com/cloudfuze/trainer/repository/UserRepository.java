package com.cloudfuze.trainer.repository;

import com.cloudfuze.trainer.domain.Role;
import com.cloudfuze.trainer.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByAzureOid(String azureOid);

    List<User> findByManagerId(Long managerId);

    List<User> findByRole(Role role);

    /**
     * For each speaking set that is currently assigned to at least one user, the most
     * recent time it was assigned. Used to pick the least-recently-used set for a new user.
     * Each row is {@code [Integer setNumber, Instant lastAssignedAt]}.
     */
    @Query("select u.speakingSetNumber, max(u.speakingSetAssignedAt) from User u " +
            "where u.speakingSetNumber is not null group by u.speakingSetNumber")
    List<Object[]> findSpeakingSetUsage();
}
