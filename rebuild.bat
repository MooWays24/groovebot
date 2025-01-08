@ECHO OFF 
CALL docker-compose down
ECHO Docker containers stopped
ECHO Rebuilding new docker containers
CALL docker-compose up --build -V -d --remove-orphans
ECHO Docker containers refreshed
PAUSE