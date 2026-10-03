-- ==========================================
-- 1. CREATE TABLE STATEMENTS
-- ==========================================

CREATE TABLE students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT
);

CREATE TABLE enrolments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    -- This prevents the same student from enrolling in the same course twice
    UNIQUE(student_id, course_id)
);

-- ==========================================
-- 2. INSERT SAMPLE DATA
-- ==========================================

-- 3 Students
INSERT INTO students (name, email) VALUES 
('Alice Smith', 'alice@example.com'),
('Bob Jones', 'bob@example.com'),
('Charlie Brown', 'charlie@example.com');

-- 3 Courses
INSERT INTO courses (title, description) VALUES 
('Mathematics', 'Intro to Algebra and Calculus'),
('Computer Science', 'Fundamentals of Programming'),
('History', 'World History Overview');

-- 5 Enrolments (Alice takes 2, Bob takes 2, Charlie takes 1)
INSERT INTO enrolments (student_id, course_id, grade) VALUES 
(1, 1, 'A'),   -- Alice in Math
(1, 2, 'B'),   -- Alice in CS
(2, 2, 'A'),   -- Bob in CS
(2, 3, 'C'),   -- Bob in History
(3, 1, 'B');   -- Charlie in Math

-- ==========================================
-- 3. THE FIVE REQUIRED QUERIES
-- ==========================================

-- Query 1: All courses for one student (by name, e.g., 'Alice Smith')
SELECT c.title, c.description
FROM students s
JOIN enrolments e ON s.id = e.student_id
JOIN courses c ON e.course_id = c.id
WHERE s.name = 'Alice Smith';

-- Query 2: All students on one course (e.g., 'Computer Science')
SELECT s.name, s.email
FROM courses c
JOIN enrolments e ON c.id = e.course_id
JOIN students s ON e.student_id = s.id
WHERE c.title = 'Computer Science';

-- Query 3: The number of students per course
SELECT c.title, COUNT(e.student_id) AS student_count
FROM courses c
LEFT JOIN enrolments e ON c.id = e.course_id
GROUP BY c.id, c.title;

-- Query 4: Students who have no enrolments
-- (We will insert a 4th student temporarily to prove this works, or just write the query)
-- Note: To see a result for this, you can run: INSERT INTO students (name, email) VALUES ('David Lee', 'david@example.com');
SELECT s.name, s.email
FROM students s
LEFT JOIN enrolments e ON s.id = e.student_id
WHERE e.student_id IS NULL;

-- Query 5: Update one enrolment's grade (e.g., change Charlie's Math grade to 'A')
UPDATE enrolments 
SET grade = 'A' 
WHERE student_id = 3 AND course_id = 1;