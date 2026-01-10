package com.byear.practiceassistant.repo;

import com.byear.practiceassistant.model.Employee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmployeeRepo extends JpaRepository<Employee, Long> {
    void deleteEmployeeById(Long id);

    List<Employee> id(Long id);

    Optional<Employee> findEmployeeById(Long id);
}
