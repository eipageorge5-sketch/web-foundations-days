# School Database Design

## Table Explanations
- **students**: Stores individual student records. Contains a unique ID, their name, and a unique email address to ensure no duplicate accounts.
- **courses**: Stores the available classes. Contains a unique ID, the course title, and an optional description.
- **enrolments**: This is a join table (or associative entity). It links students to courses and stores the grade the student received for that specific course.

## Relationships
- **One-to-Many**: A single course can have many enrolments, and a single student can have many enrolments. 
- **Many-to-Many**: A student can take many courses, and a course can have many students. 
- **Why a join table is needed**: Relational databases cannot directly link two tables in a many-to-many relationship. The `enrolments` table acts as a bridge, holding the `student_id` and `course_id` as foreign keys, allowing us to track exactly which student is in which course, along with their specific grade.

## Index Recommendation
I would add an index on the `email` column in the `students` table:
`CREATE INDEX idx_student_email ON students(email);`
**Reason**: Email is frequently used for login authentication and password resets. An index makes looking up a user by email significantly faster, especially as the student table grows to thousands of rows. (Note: SQLite automatically indexes `UNIQUE` columns, but explicitly stating it is good practice in other SQL dialects).

## SQL vs NoSQL Choice
For this school management system, I would definitively choose **SQL**. The data is highly structured and relational (students, courses, grades). We need strict data integrity, which SQL provides through foreign keys, `NOT NULL` constraints, and `UNIQUE` rules (like preventing duplicate enrolments). Furthermore, the need to run complex `JOIN` queries to generate reports (like "number of students per course") is exactly what relational databases are optimized for. NoSQL would be overkill and make enforcing these strict relationships much harder.