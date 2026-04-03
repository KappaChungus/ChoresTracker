# Stage 1: Build the application using Maven
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copy the pom.xml and download dependencies (caches them)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy the actual source code and build the .jar file
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run the application using a lightweight JRE
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy the compiled .jar file from the 'build' stage
COPY --from=build /app/target/ChoresTracker-0.0.1-SNAPSHOT.jar app.jar

# Expose port 8080 (Render will map this dynamically)
EXPOSE 8080

# Command to run the application
ENTRYPOINT ["java", "-jar", "app.jar"]