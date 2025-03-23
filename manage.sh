#!/bin/bash
# WebPlayer Development Environment Manager

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
show_banner() {
  echo -e "${BLUE}"
  echo "-------------------------------------------"
  echo "      WebPlayer Development Environment    "
  echo "-------------------------------------------"
  echo -e "${NC}"
}

# Help function
show_help() {
  echo -e "${YELLOW}Usage:${NC}"
  echo -e "  ./manage.sh ${GREEN}[command]${NC}"
  echo 
  echo -e "${YELLOW}Commands:${NC}"
  echo -e "  ${GREEN}start${NC}       Start the development environment"
  echo -e "  ${GREEN}stop${NC}        Stop the development environment"
  echo -e "  ${GREEN}restart${NC}     Restart the development environment"
  echo -e "  ${GREEN}logs${NC}        Show logs from all containers"
  echo -e "  ${GREEN}php-logs${NC}    Show PHP logs only"
  echo -e "  ${GREEN}nginx-logs${NC}  Show Nginx logs only"
  echo -e "  ${GREEN}status${NC}      Check container status"
  echo -e "  ${GREEN}composer${NC}    Run Composer commands (e.g. ./manage.sh composer install)"
  echo -e "  ${GREEN}clear-cache${NC} Clear PHP opcache and restart PHP-FPM"
  echo -e "  ${GREEN}bash${NC}        Open bash shell in PHP container"
  echo
  echo -e "${YELLOW}Examples:${NC}"
  echo -e "  ./manage.sh start"
  echo -e "  ./manage.sh composer install"
  echo -e "  ./manage.sh bash"
}

# Check if Docker is running
check_docker() {
  if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running.${NC}"
    exit 1
  fi
}

# Start the development environment
start_env() {
  echo -e "${BLUE}Starting WebPlayer development environment...${NC}"
  docker-compose up -d
  echo -e "${GREEN}Development environment started!${NC}"
  echo -e "Access your development site at: ${YELLOW}http://localhost:8080/webplayer/${NC}"
}

# Stop the development environment
stop_env() {
  echo -e "${BLUE}Stopping WebPlayer development environment...${NC}"
  docker-compose down
  echo -e "${GREEN}Development environment stopped.${NC}"
}

# Restart the development environment
restart_env() {
  echo -e "${BLUE}Restarting WebPlayer development environment...${NC}"
  docker-compose restart
  echo -e "${GREEN}Development environment restarted!${NC}"
}

# Show logs
show_logs() {
  echo -e "${BLUE}Showing logs...${NC}"
  docker-compose logs -f
}

# Show PHP logs
show_php_logs() {
  echo -e "${BLUE}Showing PHP logs...${NC}"
  docker-compose logs -f php
}

# Show Nginx logs
show_nginx_logs() {
  echo -e "${BLUE}Showing Nginx logs...${NC}"
  docker-compose logs -f nginx
}

# Check container status
check_status() {
  echo -e "${BLUE}Container status:${NC}"
  docker-compose ps
}

# Run composer commands
run_composer() {
  if [ $# -eq 0 ]; then
    echo -e "${RED}Error: No composer commands provided.${NC}"
    echo -e "Example: ${YELLOW}./manage.sh composer install${NC}"
    exit 1
  fi
  
  echo -e "${BLUE}Running composer $*...${NC}"
  docker-compose exec php composer "$@"
}

# Clear PHP cache
clear_cache() {
  echo -e "${BLUE}Clearing PHP cache...${NC}"
  docker-compose exec php sh -c 'php -r "opcache_reset();" || echo "Opcache not enabled"'
  docker-compose restart php
  echo -e "${GREEN}PHP cache cleared and service restarted.${NC}"
}

# Open bash shell in PHP container
run_bash() {
  echo -e "${BLUE}Opening bash shell in PHP container...${NC}"
  docker-compose exec php sh
}

# Main 
show_banner
check_docker

# Process arguments
case "$1" in
  start)
    start_env
    ;;
  stop)
    stop_env
    ;;
  restart)
    restart_env
    ;;
  logs)
    show_logs
    ;;
  php-logs)
    show_php_logs
    ;;
  nginx-logs)
    show_nginx_logs
    ;;
  status)
    check_status
    ;;
  composer)
    shift
    run_composer "$@"
    ;;
  clear-cache)
    clear_cache
    ;;
  bash)
    run_bash
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    show_help
    ;;
esac