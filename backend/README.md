# Al Ahad Attars - Backend

This is the foundational backend module for the Al Ahad Attars enterprise application.

## Technologies Used
- Java 21
- Spring Boot 3.x
- Maven
- Spring Web
- Spring Data JPA
- Spring Security (Basic Config)
- MySQL
- Hibernate
- Lombok
- Spring Validation
- Spring Boot DevTools
- Swagger / OpenAPI

## Project Structure
The project follows a standard enterprise Spring Boot architecture:
- `config`: Configuration classes (Security, CORS, OpenAPI)
- `controller`: REST APIs
- `dto`: Data Transfer Objects (Future use)
- `entity`: JPA Entities including `BaseEntity`
- `exception`: Global exception handling
- `mapper`: Object mapping logic (Future use)
- `repository`: Data access layer (Future use)
- `response`: Standardized API responses
- `security`: Advanced security implementations (Future use)
- `service`: Business logic interfaces (Future use)
- `service/impl`: Business logic implementations (Future use)
- `constant`: Application constants (Future use)
- `util`: Utility classes (Future use)

## How to Run

1. Ensure MySQL is running on port `3306` with a database named `alahadattars`.
   - Update `src/main/resources/application.yml` with your database credentials or set environment variables (`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`).
2. Run the application using Maven:
   ```bash
   mvn spring-boot:run
   ```
3. The application will start on port `8080`.

## Endpoints
- **Health Check**: `GET /api/health`
- **Swagger UI**: `http://localhost:8080/swagger-ui/index.html`
