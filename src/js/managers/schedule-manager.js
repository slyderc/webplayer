/**
 * ScheduleManager - Handles schedule data and display
 */
class ScheduleManager {
    constructor(options = {}) {
        this.options = {
            scheduleUrl: './schedule.json',
            pollInterval: 3600000, // 1 hour
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
                this.updateScheduleView();
            })
            .catch(error => {
                console.error('Error fetching schedule:', error);
                // Fall back to mock data in case of error
                this.mockScheduleData().then(mockData => {
                    this.scheduleData = mockData;
                    this.updateScheduleView();
                });
            });
    }
    
    /**
     * Update the schedule view with current data
     */
    updateScheduleView() {
        if (!this.scheduleData) {
            this.scheduleContainer.innerHTML = '<p class="no-data-message">Schedule information is currently unavailable</p>';
            return;
        }
        
        // Group shows by date
        const groupedShows = this.groupShowsByDate(this.scheduleData);
        
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
     * This method handles shows without explicit end times by looking at the next show
     */
    isShowOnAir(show, currentTime, allShows) {
        const startTime = new Date(show.startTime);
        
        // If current time is before the show starts, it's not on air
        if (currentTime < startTime) {
            return false;
        }
        
        // Find the next show after this one
        const sortedShows = [...allShows].sort((a, b) => 
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
     * This provides fallback data when the actual API is unavailable
     */
    async mockScheduleData() {
        // Current date
        const today = new Date();
        const monday = new Date(today);
        
        // Adjust to get the next Monday if we're past Monday already
        const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday
        const daysToAdd = (dayOfWeek <= 1) ? (1 - dayOfWeek) : (8 - dayOfWeek);
        monday.setDate(today.getDate() + daysToAdd);
        
        // Format dates to YYYY-MM-DD
        const todayStr = today.toISOString().split('T')[0];
        const mondayStr = monday.toISOString().split('T')[0];
        
        // Create some mock shows based on the mockup
        return [
            {
                id: 1,
                title: "The Newer New Wave Show",
                presenter: "Dmitri Baughman",
                description: "The freshest new wave, post-punk, and synth-pop tracks.",
                image: "/player/NWR_text_logo_angle.png",
                startTime: `${todayStr}T12:00:00`
            },
            {
                id: 2,
                title: "Flashback",
                presenter: "DJ Retro",
                description: "Classic hits from the 80s and 90s.",
                image: "/player/NWR_text_logo_angle.png",
                startTime: `${todayStr}T15:00:00`
            },
            {
                id: 3,
                title: "Now Wave Mix",
                presenter: "Mix Master",
                description: "Continuous mix of the latest electronic beats.",
                image: "/player/NWR_text_logo_angle.png",
                startTime: `${todayStr}T17:00:00`
            },
            {
                id: 4,
                title: "Now Wave Nights",
                presenter: "Night Owl",
                description: "Late night vibes for the night owls.",
                image: "/player/NWR_text_logo_angle.png",
                startTime: `${todayStr}T21:00:00`
            },
            {
                id: 5,
                title: "Steve Machine",
                presenter: "Steve",
                description: "Eclectic selection of underground electronic music.",
                image: "/player/NWR_text_logo_angle.png",
                startTime: `${mondayStr}T00:00:00`
            }
        ];
    }
}

// Export as global or module depending on environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScheduleManager;
} else {
    window.ScheduleManager = ScheduleManager;
}