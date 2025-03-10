# WebPlayer Development Guide

## Build & Run Commands
- Start development server: `docker-compose up`
- Access app: http://localhost:8080
- Run composer install: `docker-compose exec php composer install`
- Clear loved tracks history (test): `node teststubs/clearLovedHistory.js`
- View liked tracks in console: `node teststubs/console-LikedTracks.js`

## Code Style Guidelines
- **JavaScript**:
  - ES6 class-based architecture with modules
  - camelCase for variables and methods
  - Classes organized into managers/ and services/
  - Arrow functions for callbacks
  - Document complex methods with JSDoc comments

- **PHP**:
  - PSR-4 autoloading (Vibe namespace)
  - PHP 8.2+ features preferred

- **CSS**:
  - BEM-like naming (component-element--modifier)
  - Mobile-first responsive design
  - Custom properties for theming

## Project Structure
- Front-end: Modular JS with manager/service pattern
- Backend: Simple PHP endpoints with SQLite for persistence
- Docker: PHP 8.2-FPM + Nginx for local development