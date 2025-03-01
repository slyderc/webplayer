/**
 * ScheduleManager - Handles schedule data and display with support for recurring patterns
 */
class ScheduleManager {
    constructor(options = {}) {
        this.options = {
            scheduleUrl: './schedule.json',
            pollInterval: 900000, // 1 hour
            daysToShow: 7, // Number of days to display in the schedule
            ...options
        };
        
        this.scheduleData = null;
        this.lastFetchTime = 0;
        
        // Cache DOM elements
        this.scheduleView = document.getElementById('scheduleView');
    }
    
    /**
     * Initialize the schedule manager
     */
    initialize() {
        // Add the schedule container to the view
        this.scheduleView.innerHTML = '<div class="schedule-container"></div>';
        this.scheduleContainer = this.scheduleView.querySelector('.schedule-container');
        
        // Initial schedule fetch
        this.fetchSchedule();
        
        // Set up polling for schedule updates
        setInterval(() => this.fetchSchedule(), this.options.pollInterval);
        
        return this;
    }
    
    /**
     * Fetch schedule data
     */
    fetchSchedule() {
        // Add cache-busting timestamp parameter
        const timestamp = new Date().getTime();
        const url = `${this.options.scheduleUrl}?t=${timestamp}`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                this.scheduleData = data;
                this.generateSchedule();
            })
            .catch(error => {
                console.error('Error fetching schedule:', error);
                // Fall back to mock data in case of error
                this.mockScheduleData().then(mockData => {
                    this.scheduleData = mockData;
                    this.generateSchedule();
                });
            });
    }
    
    /**
     * Generate a schedule for the current week based on patterns
     */
    generateSchedule() {
        if (!this.scheduleData) {
            this.scheduleContainer.innerHTML = '<p class="no-data-message">Schedule information is currently unavailable</p>';
            return;
        }
        
        // Start with today
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of day
        
        const generatedSchedule = [];
        
        // Generate schedule for the specified number of days
        for (let i = 0; i < this.options.daysToShow; i++) {
            const currentDate = new Date(today);
            currentDate.setDate(today.getDate() + i);
            
            // Add weekly shows for this day of week
            this.addWeeklyShows(generatedSchedule, currentDate);
            
            // Add weekday shows (Mon-Fri)
            this.addWeekdayShows(generatedSchedule, currentDate);
            
            // Add special shows that fall on this date
            this.addSpecialShows(generatedSchedule, currentDate);
        }
        
        // Sort the schedule by start time
        generatedSchedule.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        
        // Update the view with the generated schedule
        this.updateScheduleView(generatedSchedule);
    }
    
    /**
     * Add weekly shows for a specific date
     */
    addWeeklyShows(schedule, date) {
        if (!this.scheduleData.weekly || !this.scheduleData.weekly.length) {
            return;
        }
        
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        this.scheduleData.weekly.forEach(show => {
            // Check if this show runs on this day of week
            if (show.day === dayOfWeek) {
                // Create a date object for the show's start time on this date
                const [hours, minutes] = show.startTime.split(':').map(Number);
                const startTime = new Date(date);
                startTime.setHours(hours, minutes, 0, 0);
                
                schedule.push({
                    ...show,
                    startTime: startTime.toISOString()
                });
            }
        });
    }
    
    /**
     * Add weekday shows (Mon-Fri) for a specific date
     */
    addWeekdayShows(schedule, date) {
        if (!this.scheduleData.weekdays || !this.scheduleData.weekdays.length) {
            return;
        }
        
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Only add weekday shows for Monday through Friday (1-5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            this.scheduleData.weekdays.forEach(show => {
                // Create a date object for the show's start time on this date
                const [hours, minutes] = show.startTime.split(':').map(Number);
                const startTime = new Date(date);
                startTime.setHours(hours, minutes, 0, 0);
                
                schedule.push({
                    ...show,
                    startTime: startTime.toISOString()
                });
            });
        }
    }
    
    /**
     * Add special one-time shows for a specific date
     */
    addSpecialShows(schedule, date) {
        if (!this.scheduleData.special || !this.scheduleData.special.length) {
            return;
        }
        
        // Normalize date to start of day for comparison
        const dateStr = date.toISOString().split('T')[0];
        
        this.scheduleData.special.forEach(show => {
            // Get date part of special show
            const showDateStr = new Date(show.startTime).toISOString().split('T')[0];
            
            // Check if this special show falls on the current date
            if (showDateStr === dateStr) {
                schedule.push({...show});
            }
        });
    }
    
    /**
     * Update the schedule view with generated schedule
     */
    updateScheduleView(schedule) {
        if (!schedule || !schedule.length) {
            this.scheduleContainer.innerHTML = '<p class="no-data-message">No scheduled shows for the upcoming week</p>';
            return;
        }
        
        // Group shows by date
        const groupedShows = this.groupShowsByDate(schedule);
        
        // Clear the container
        this.scheduleContainer.innerHTML = '';
        
        // Get current date and time for "On Air" status
        const now = new Date();
        
        // Process each date group
        Object.keys(groupedShows).forEach(dateKey => {
            const shows = groupedShows[dateKey];
            const dateObj = new Date(dateKey);
            
            // Create date header
            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';
            dateHeader.innerHTML = `<h2>${this.formatDateHeader(dateObj)}</h2>`;
            this.scheduleContainer.appendChild(dateHeader);
            
            // Create show items
            shows.forEach(show => {
                const showElement = this.createShowElement(show, now);
                this.scheduleContainer.appendChild(showElement);
            });
        });
    }
    
    /**
     * Group shows by date
     */
    groupShowsByDate(shows) {
        const grouped = {};
        
        shows.forEach(show => {
            // Get date part only (YYYY-MM-DD)
            const showDate = new Date(show.startTime);
            const dateKey = showDate.toISOString().split('T')[0];
            
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            
            grouped[dateKey].push(show);
        });
        
        return grouped;
    }
    
    /**
     * Format date for header display
     */
    formatDateHeader(date) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const day = days[date.getDay()];
        
        // Format date as MM/DD/YYYY
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const dayOfMonth = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day} - ${month}/${dayOfMonth}/${year}`;
    }
    
    /**
     * Format time for display (12-hour format with AM/PM)
     */
    formatTime(dateString) {
        const date = new Date(dateString);
        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        hours = hours % 12;
        hours = hours ? hours : 12; // Convert 0 to 12
        
        return `${hours}:${minutes} ${ampm}`;
    }
    
    /**
     * Check if a show is currently on air
     */
    isShowOnAir(show, currentTime, allShows) {
        const startTime = new Date(show.startTime);
        
        // If current time is before the show starts, it's not on air
        if (currentTime < startTime) {
            return false;
        }
        
        // Find the next show after this one on the same day
        const showDate = startTime.toISOString().split('T')[0];
        const sameDayShows = allShows.filter(s => {
            const sDate = new Date(s.startTime).toISOString().split('T')[0];
            return sDate === showDate;
        });
        
        const sortedShows = [...sameDayShows].sort((a, b) => 
            new Date(a.startTime) - new Date(b.startTime)
        );
        
        const currentIndex = sortedShows.findIndex(s => s.id === show.id);
        const nextShow = sortedShows[currentIndex + 1];
        
        // If there is a next show, check if current time is before it starts
        if (nextShow) {
            const nextShowStart = new Date(nextShow.startTime);
            return currentTime < nextShowStart;
        }
        
        // If this is the last show of the day, consider it on air until end of day
        const endOfDay = new Date(startTime);
        endOfDay.setHours(23, 59, 59, 999);
        
        return currentTime <= endOfDay;
    }
    
    /**
     * Create a show element
     */
    createShowElement(show, currentTime) {
        const isOnAir = this.isShowOnAir(show, currentTime, this.scheduleData);
        
        const showElement = document.createElement('div');
        showElement.className = `schedule-item${isOnAir ? ' on-air' : ''}`;
        
        showElement.innerHTML = `
            <div class="schedule-item-image">
                <img src="${show.image || '/player/NWR_text_logo_angle.png'}" alt="${show.title}">
            </div>
            <div class="schedule-item-content">
                <div class="schedule-item-title-row">
                    <h3 class="schedule-item-title">${show.title}</h3>
                    <div class="schedule-item-time">
                        <span>${this.formatTime(show.startTime)}</span>
                        <div class="on-air-badge">On Air</div>
                    </div>
                </div>
                <p class="schedule-item-presenter">with ${show.presenter}</p>
                <p class="schedule-item-description">${show.description || ''}</p>
            </div>
        `;
        
        return showElement;
    }
    
    /**
     * Mock schedule data for testing
     */
    async mockScheduleData() {
        return {
            "weekly": [
                {
                    "id": 1,
                    "title": "The Newer New Wave Show",
                    "presenter": "Dmitri Baughman",
                    "description": "The freshest new wave, post-punk, and synth-pop tracks.",
                    "image": "/player/NWR_text_logo_angle.png",
                    "day": 5, // Friday
                    "startTime": "12:00"
                },
                {
                    "id": 2,
                    "title": "Flashback",
                    "presenter": "DJ Retro",
                    "description": "Classic hits from the 80s and 90s.",
                    "image": "/player/NWR_text_logo_angle.png",
                    "day": 5, // Friday
                    "startTime": "15:00"
                }
            ],
            "weekdays": [
                {
                    "id": 3,
                    "title": "Morning Wave",
                    "presenter": "Early Riser",
                    "description": "Start your day with the best new wave tracks.",
                    "image": "/player/NWR_text_logo_angle.png",
                    "startTime": "08:00"
                }
            ],
            "special": []
        };
    }
}

// Export as global or module depending on environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScheduleManager;
} else {
    window.ScheduleManager = ScheduleManager;
}