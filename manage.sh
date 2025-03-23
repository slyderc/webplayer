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
  echo -e "  ${GREEN}analytics${NC}   View development analytics data"
  echo -e "  ${GREEN}clear-analytics${NC} Clear development analytics data"
  echo -e "  ${GREEN}check${NC}       Run diagnostics on the development environment"
  echo -e "  ${GREEN}test${NC}        Open the test runner in your default browser"
  echo
  echo -e "${YELLOW}Examples:${NC}"
  echo -e "  ./manage.sh start"
  echo -e "  ./manage.sh composer install"
  echo -e "  ./manage.sh analytics"
  echo -e "  ./manage.sh test"
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

# View analytics data in development
view_analytics() {
  echo -e "${BLUE}Development analytics data:${NC}"
  docker-compose exec php sh -c "cd /var/www/html/php && php -r '
    if (!class_exists(\"SQLite3\")) {
      echo \"SQLite3 extension not available - cannot view analytics data\n\";
      exit(1);
    }
    try {
      \$db = new SQLite3(\"data/dev/tracks.db\");
      echo \"\nPopular tracks:\n\";
      \$results = \$db->query(\"
        SELECT 
            t.artist, 
            t.title, 
            COUNT(CASE WHEN a.action_type = \\\"like\\\" THEN 1 END) - 
            COUNT(CASE WHEN a.action_type = \\\"unlike\\\" THEN 1 END) AS net_likes
        FROM 
            tracks t
        LEFT JOIN 
            actions a ON t.hash = a.hash
        GROUP BY 
            t.hash
        HAVING 
            net_likes > 0
        ORDER BY 
            net_likes DESC, t.first_seen DESC
        LIMIT 10
      \");
      
      \$found = false;
      while (\$row = \$results->fetchArray(SQLITE3_ASSOC)) {
        \$found = true;
        echo \"· {\$row[\"artist\"]} - {\$row[\"title\"]} ({\$row[\"net_likes\"]} likes)\n\";
      }
      
      if (!\$found) {
        echo \"No liked tracks yet.\n\";
      }
      
      echo \"\nRecent actions:\n\";
      \$results = \$db->query(\"
        SELECT 
            t.artist, 
            t.title,
            a.action_type,
            a.timestamp
        FROM 
            actions a
        JOIN 
            tracks t ON a.hash = t.hash
        ORDER BY 
            a.timestamp DESC
        LIMIT 10
      \");
      
      \$found = false;
      while (\$row = \$results->fetchArray(SQLITE3_ASSOC)) {
        \$found = true;
        echo \"· {\$row[\"timestamp\"]}: {\$row[\"action_type\"]} - {\$row[\"artist\"]} - {\$row[\"title\"]}\n\";
      }
      
      if (!\$found) {
        echo \"No actions recorded yet.\n\";
      }
      
    } catch (Exception \$e) {
      echo \"Error: \" . \$e->getMessage() . \"\n\";
    }
  '";
}

# Clear development analytics data
clear_analytics() {
  echo -e "${YELLOW}Warning: This will clear all development analytics data.${NC}"
  read -p "Are you sure you want to continue? (y/n) " -n 1 -r
  echo
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Clearing development analytics data...${NC}"
    docker-compose exec php sh -c "rm -f /var/www/html/php/data/dev/tracks.db"
    echo -e "${GREEN}Analytics data cleared.${NC}"
  else
    echo -e "${BLUE}Operation cancelled.${NC}"
  fi
}

# Run diagnostic checks on the environment
run_diagnostics() {
  echo -e "${BLUE}Running development environment diagnostics...${NC}"
  
  # Check if containers are running
  echo -e "\n${YELLOW}Container Status:${NC}"
  docker-compose ps
  
  # Check PHP version and extensions
  echo -e "\n${YELLOW}PHP Version and Extensions:${NC}"
  docker-compose exec php php -v
  
  echo -e "\n${YELLOW}Critical PHP Extensions:${NC}"
  docker-compose exec php php -r "
    \$extensions = [
      'sqlite3' => extension_loaded('sqlite3'),
      'pdo_sqlite' => extension_loaded('pdo_sqlite'),
      'json' => extension_loaded('json')
    ];
    
    foreach (\$extensions as \$ext => \$loaded) {
      echo \$loaded ? \"✅ \$ext: Loaded\n\" : \"❌ \$ext: MISSING\n\";
    }
  "
  
  # Check SQLite3 functionality
  echo -e "\n${YELLOW}Testing SQLite3 Functionality:${NC}"
  docker-compose exec php php -r "
    try {
      \$db = new SQLite3(':memory:');
      \$db->exec('CREATE TABLE test (id INTEGER, name TEXT)');
      \$db->exec('INSERT INTO test VALUES (1, \"Test successful\")');
      \$result = \$db->query('SELECT * FROM test');
      \$row = \$result->fetchArray(SQLITE3_ASSOC);
      echo \"✅ SQLite3 test: \$row[name]\n\";
      \$db->close();
    } catch (Exception \$e) {
      echo \"❌ SQLite3 test failed: \" . \$e->getMessage() . \"\n\";
    }
  "
  
  # Check web server access
  echo -e "\n${YELLOW}Testing Web Server:${NC}"
  docker-compose exec php curl -I http://nginx/webplayer/ 2>/dev/null || echo "❌ Web server test failed"
  
  # Check data directory permissions
  echo -e "\n${YELLOW}Data Directory Permissions:${NC}"
  docker-compose exec php sh -c "ls -l /var/www/html/php/data"
  
  echo -e "\n${GREEN}Diagnostics complete!${NC}"
}

# Main 
show_banner
check_docker

# Open test runner in browser
run_tests() {
  echo -e "${BLUE}Opening WebPlayer test runner in your browser...${NC}"
  
  # Determine operating system and open browser accordingly
  case "$(uname)" in
    "Darwin")  # macOS
      open "http://localhost:8080/webplayer/tests/runner.html"
      ;;
    "Linux")
      if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:8080/webplayer/tests/runner.html"
      else
        echo -e "${YELLOW}Could not open browser automatically.${NC}"
        echo -e "Please visit: ${GREEN}http://localhost:8080/webplayer/tests/runner.html${NC}"
      fi
      ;;
    "MINGW"*|"MSYS"*|"CYGWIN"*)  # Windows
      start "http://localhost:8080/webplayer/tests/runner.html"
      ;;
    *)
      echo -e "${YELLOW}Could not open browser automatically.${NC}"
      echo -e "Please visit: ${GREEN}http://localhost:8080/webplayer/tests/runner.html${NC}"
      ;;
  esac
}

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
  analytics)
    view_analytics
    ;;
  clear-analytics)
    clear_analytics
    ;;
  check)
    run_diagnostics
    ;;
  test)
    run_tests
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    show_help
    ;;
esac