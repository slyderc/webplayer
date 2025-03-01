/**
 * ScheduleManager - Handles schedule data and display with support for recurring patterns
 */
window.debugSchedule = function() {
    if (window.scheduleManager) {
        window.scheduleManager.debugOnAirStatus();
    } else {
        console.error("scheduleManager not found on window object");
    }
};

class ScheduleManager {
    constructor(options = {}) {
        this.options = {
            scheduleUrl: './schedule.json',
            pollInterval: 900000, // 15 minutes
            daysToShow: 7, // Number of days to display in the schedule
            ...options
        };
        
        this.scheduleData = null;
        this.lastFetchTime = 0;
        
        // Cache DOM elements
        this.scheduleView = document.getElementById('scheduleView');
        
        // Make this instance available for debugging
        window.scheduleManager = this;
    }
        
    /**
     * Initialize the schedule manager
     */
    initialize() {
        // First verify DOM elements are found
        if (!this.scheduleView) {
            console.error('Schedule view element not found');
            return this;
        }
        
        console.log('Initializing schedule manager');
        
        // Add the schedule container to the view
        this.scheduleView.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'schedule-container';
        this.scheduleView.appendChild(container);
        this.scheduleContainer = container;
        
        // Initial schedule fetch
        this.fetchSchedule();
        
        // Set up polling for schedule updates
        setInterval(() => this.fetchSchedule(), this.options.pollInterval);
        
        // Make this instance available globally
        window.scheduleManager = this;
        
        return this;
    }

    handleTabActivation() {
        console.log('Schedule tab activated - handling activation');
        
        // First ensure we have a valid scheduleView reference
        if (!this.scheduleView) {
            this.scheduleView = document.getElementById('scheduleView');
            if (!this.scheduleView) {
                console.error('Cannot find scheduleView element');
                return;
            }
        }
        
        // Check if the container exists, recreate if needed
        if (!this.scheduleContainer || !this.scheduleView.contains(this.scheduleContainer)) {
            console.log('Recreating schedule container');
            this.scheduleView.innerHTML = '';
            const container = document.createElement('div');
            container.className = 'schedule-container';
            this.scheduleView.appendChild(container);
            this.scheduleContainer = container;
        }
        
        // If we have cached schedule data, use it
        if (this.generatedSchedule && this.generatedSchedule.length > 0) {
            console.log('Using cached schedule data with', this.generatedSchedule.length, 'shows');
            const now = new Date();
            this.updateScheduleView(this.generatedSchedule, now);
        } 
        // Otherwise fetch fresh data
        else {
            console.log('No cached data - fetching schedule');
            this.fetchSchedule().catch(err => {
                console.error('Error fetching schedule:', err);
                if (this.scheduleContainer) {
                    this.scheduleContainer.innerHTML = '<p class="no-data-message">Error loading schedule</p>';
                }
            });
        }
    }
            
    /**
     * Fetch schedule data
     */
    fetchSchedule() {
        // Add cache-busting timestamp parameter
        const timestamp = new Date().getTime();
        const url = `${this.options.scheduleUrl}?t=${timestamp}`;
        
        console.log('Fetching schedule from:', url);
        
        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                console.log('Schedule fetch successful');
                return response.json();
            })
            .then(data => {
                console.log('Schedule data parsed successfully:', data);
                this.scheduleData = data;
                
                try {
                    this.generateSchedule();
                } catch (genError) {
                    console.error('Error generating schedule:', genError);
                    console.log('Falling back to mock data due to generation error');
                    return this.mockScheduleData().then(mockData => {
                        this.scheduleData = mockData;
                        this.generateSchedule();
                    });
                }
                
                return data;
            })
            .catch(error => {
                console.error('Error fetching schedule:', error);
                console.error('Attempted to fetch from:', url);
                // Fall back to mock data in case of error
                console.log('Falling back to mock data due to fetch error');
                return this.mockScheduleData().then(mockData => {
                    this.scheduleData = mockData;
                    this.generateSchedule();
                    return mockData;
                });
            });
    }
                
    /**
     * Generate a schedule for the current week based on patterns
     */
    generateSchedule() {
        console.log('Starting schedule generation');
        
        if (!this.scheduleData) {
            console.error('No schedule data available');
            if (this.scheduleContainer) {
                this.scheduleContainer.innerHTML = '<p class="no-data-message">Schedule information is currently unavailable</p>';
            }
            return;
        }
        
        // Get the current date
        const actualNow = new Date();
        
        // Start with actual today at midnight
        const today = new Date(actualNow.getFullYear(), actualNow.getMonth(), actualNow.getDate());
        
        // Generate schedule from patterns
        const generatedSchedule = [];
        
        try {
            // Generate schedule for each day
            for (let i = 0; i < this.options.daysToShow; i++) {
                const currentDate = new Date(today);
                currentDate.setDate(today.getDate() + i);
                
                // Add all types of shows
                this.addWeeklyShows(generatedSchedule, currentDate);
                this.addWeekdayShows(generatedSchedule, currentDate);
                this.addSpecialShows(generatedSchedule, currentDate);
            }
            
            console.log(`Generated ${generatedSchedule.length} total shows`);
            
            if (generatedSchedule.length === 0) {
                console.warn('No shows were generated');
                if (this.scheduleContainer) {
                    this.scheduleContainer.innerHTML = '<p class="no-data-message">No scheduled shows for the upcoming week</p>';
                }
                return;
            }
            
            // Sort the schedule by start time
            generatedSchedule.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
            
            // Cache the generated schedule for reuse
            this.generatedSchedule = generatedSchedule;
            
            // Update the view
            this.updateScheduleView(generatedSchedule, actualNow);
            
        } catch (error) {
            console.error('Error in schedule generation:', error);
            if (this.scheduleContainer) {
                this.scheduleContainer.innerHTML = '<p class="no-data-message">Error generating schedule</p>';
            }
        }
    }
                            
    /**
     * Add weekly shows for a specific date
     */
    addWeeklyShows(schedule, date) {
        try {
            if (!this.scheduleData.weekly || !Array.isArray(this.scheduleData.weekly) || this.scheduleData.weekly.length === 0) {
                console.log('No weekly shows data available');
                return;
            }
            
            const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
            console.log(`Looking for shows on day ${dayOfWeek} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek]})`);
            
            this.scheduleData.weekly.forEach((show, index) => {
                try {
                    if (show.day === undefined) {
                        console.warn(`Show #${index} is missing the day property:`, show);
                        return; // Skip this show
                    }
                    
                    // Check if this show runs on this day of week - with explicit log
                    if (show.day === dayOfWeek) {
                        console.log(`Found show "${show.title}" for day ${dayOfWeek} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek]})`);
                        
                        if (!show.startTime) {
                            console.warn(`Show "${show.title}" is missing startTime property`);
                            return; // Skip this show
                        }
                        
                        // Create a date object for the show's start time on this date
                        try {
                            const [hours, minutes] = show.startTime.split(':').map(Number);
                            const startTime = new Date(date);
                            startTime.setHours(hours, minutes, 0, 0);
                            
                            schedule.push({
                                ...show,
                                startTime: startTime.toISOString()
                            });
                            
                            console.log(`Added weekly show "${show.title}" at ${startTime.toISOString()} (${hours}:${minutes})`);
                        } catch (timeError) {
                            console.error(`Error processing time for "${show.title}":`, timeError);
                        }
                    }
                } catch (showError) {
                    console.error(`Error processing weekly show at index ${index}:`, showError);
                }
            });
        } catch (error) {
            console.error('Error in addWeeklyShows:', error);
        }
    }
            
    /**
     * Add weekday shows (Mon-Fri) for a specific date
     */
    addWeekdayShows(schedule, date) {
        try {
            if (!this.scheduleData.weekdays || !Array.isArray(this.scheduleData.weekdays) || this.scheduleData.weekdays.length === 0) {
                console.log('No weekday shows data available');
                return;
            }
            
            const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
            
            // Only add weekday shows for Monday through Friday (1-5)
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                console.log(`Adding weekday shows for day ${dayOfWeek}`);
                
                this.scheduleData.weekdays.forEach((show, index) => {
                    try {
                        if (!show.startTime) {
                            console.warn(`Weekday show #${index} is missing startTime property`);
                            return; // Skip this show
                        }
                        
                        // Create a date object for the show's start time on this date
                        try {
                            const [hours, minutes] = show.startTime.split(':').map(Number);
                            const startTime = new Date(date);
                            startTime.setHours(hours, minutes, 0, 0);
                            
                            schedule.push({
                                ...show,
                                startTime: startTime.toISOString()
                            });
                            
                            console.log(`Added weekday show "${show.title}" at ${startTime.toISOString()}`);
                        } catch (timeError) {
                            console.error(`Error processing time for weekday show "${show.title}":`, timeError);
                        }
                    } catch (showError) {
                        console.error(`Error processing weekday show at index ${index}:`, showError);
                    }
                });
            } else {
                console.log(`Skipping weekday shows for day ${dayOfWeek} (weekend)`);
            }
        } catch (error) {
            console.error('Error in addWeekdayShows:', error);
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
    updateScheduleView(schedule, actualNow) {
        console.log('⭐⭐⭐ Starting schedule view update ⭐⭐⭐');
        
        // Fail fast if container not found
        if (!this.scheduleContainer) {
            console.error('Schedule container not found');
            return;
        }
        
        // Clear existing content completely
        this.scheduleContainer.innerHTML = '';
        
        if (!schedule || !schedule.length) {
            this.scheduleContainer.innerHTML = '<p class="no-data-message">No shows available</p>';
            return;
        }
        
        // Group shows by date
        const groupedShows = {};
        schedule.forEach(show => {
            if (!show.startTime) return;
            
            const date = new Date(show.startTime);
            const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
            
            if (!groupedShows[dateKey]) {
                groupedShows[dateKey] = [];
            }
            
            groupedShows[dateKey].push(show);
        });
        
        // Get date keys and sort chronologically
        const dateKeys = Object.keys(groupedShows).sort();
        console.log('Processing dates:', dateKeys);
        
        // Process each date group
        dateKeys.forEach(dateKey => {
            const shows = groupedShows[dateKey];
            const dateObj = new Date(dateKey + 'T00:00:00');
            
            console.log(`Adding date header for ${dateKey} with ${shows.length} shows`);
            
            // Create date header
            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';
            
            // Format date as "Day - MM/DD/YYYY"
            const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateObj.getDay()];
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            const year = dateObj.getFullYear();
            
            dateHeader.innerHTML = `<h2>${dayName} - ${month}/${day}/${year}</h2>`;
            this.scheduleContainer.appendChild(dateHeader);
            
            // Sort shows for this date by time
            shows.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
            
            // Add each show
            shows.forEach(show => {
                try {
                    const showElement = this.createShowElement(show, actualNow, schedule);
                    this.scheduleContainer.appendChild(showElement);
                } catch (e) {
                    console.error('Failed to create show element:', e);
                }
            });
        });
        
        console.log('Schedule view update complete');
    }
                        
    /**
     * Group shows by date
     */
    groupShowsByDate(shows) {
        const grouped = {};
        
        shows.forEach(show => {
            if (!show.startTime) {
                console.warn("Show missing startTime:", show);
                return;
            }
            
            try {
                // Get date part only (YYYY-MM-DD)
                const showDate = new Date(show.startTime);
                const dateKey = showDate.toISOString().split('T')[0];
                
                if (!grouped[dateKey]) {
                    grouped[dateKey] = [];
                }
                
                grouped[dateKey].push(show);
            } catch (e) {
                console.error("Error grouping show by date:", e, show);
            }
        });
        
        return grouped;
    }
        
    /**
     * Format date for header display
     */
    formatDateHeader(date) {
        try {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const day = days[date.getDay()];
            
            // Format date as MM/DD/YYYY
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const dayOfMonth = String(date.getDate()).padStart(2, '0');
            const year = date.getFullYear();
            
            return `${day} - ${month}/${dayOfMonth}/${year}`;
        } catch (e) {
            console.error("Error formatting date header:", e, date);
            return "Unknown Date";
        }
    }
        
    /**
     * Check if a show is currently on air
     */
    isShowOnAir(show, currentTime, allShows) {
        try {
            // For debugging specific problematic shows
            const isWeekendShow = show.title === "Weekend Wave";
            
            if (isWeekendShow) {
                console.log("==== CHECKING ON-AIR STATUS FOR WEEKEND WAVE ====");
                console.log("Current time:", currentTime.toLocaleString());
            }
            
            if (!show.startTime) {
                if (isWeekendShow) console.log("No start time, not on air");
                return false;
            }
            
            const showStartTime = new Date(show.startTime);
            
            if (isWeekendShow) {
                console.log("Show start time:", showStartTime.toLocaleString());
                console.log("Has show started?", currentTime >= showStartTime);
            }
            
            // If show hasn't started yet, it's not on air
            if (currentTime < showStartTime) {
                return false;
            }
            
            // Get the date string (YYYY-MM-DD) of the show
            const showDateStr = showStartTime.toISOString().split('T')[0];
            
            // Find all shows on the same day
            const sameDayShows = allShows.filter(s => {
                if (!s.startTime) return false;
                const sDateStr = new Date(s.startTime).toISOString().split('T')[0];
                return sDateStr === showDateStr;
            });
            
            if (isWeekendShow) {
                console.log(`Found ${sameDayShows.length} shows on the same day`);
            }
            
            // Sort by start time
            const sortedShows = sameDayShows.sort((a, b) => 
                new Date(a.startTime) - new Date(b.startTime)
            );
            
            // Find the position of the current show
            const currentIndex = sortedShows.findIndex(s => s.id === show.id);
            
            if (isWeekendShow) {
                console.log(`Show position in day's lineup: ${currentIndex + 1} of ${sortedShows.length}`);
            }
            
            if (currentIndex === -1) {
                if (isWeekendShow) console.log("Show not found in sorted list");
                return false;
            }
            
            // If there's a next show, check if current time is before it starts
            if (currentIndex < sortedShows.length - 1) {
                const nextShow = sortedShows[currentIndex + 1];
                const nextShowStart = new Date(nextShow.startTime);
                
                if (isWeekendShow) {
                    console.log(`Next show: ${nextShow.title} at ${nextShowStart.toLocaleString()}`);
                    console.log(`Is before next show? ${currentTime < nextShowStart}`);
                }
                
                return currentTime < nextShowStart;
            }
            
            // If it's the last show of the day, it's on air until end of the day
            const endOfDay = new Date(showDateStr);
            endOfDay.setHours(23, 59, 59, 999);
            
            if (isWeekendShow) {
                console.log(`Last show of the day, on until ${endOfDay.toLocaleString()}`);
                console.log(`Is before end of day? ${currentTime <= endOfDay}`);
            }
            
            return currentTime <= endOfDay;
        } catch (error) {
            console.error('Error in isShowOnAir:', error, show);
            return false;
        }
    }
                        
    debugOnAirStatus() {
        const now = new Date();
        console.log("CURRENT ACTUAL TIME:", now.toISOString());
        
        this.fetchSchedule()
            .then(() => {
                if (!this.scheduleData) {
                    console.error("No schedule data available");
                    return;
                }
                
                console.log("CHECKING ON AIR STATUS FOR ALL SHOWS:");
                
                // Generate a full schedule
                const generatedSchedule = [];
                
                // Start with today
                const today = new Date(now);
                today.setHours(0, 0, 0, 0);
                
                // Process a full week
                for (let i = 0; i < 7; i++) {
                    const currentDate = new Date(today);
                    currentDate.setDate(today.getDate() + i);
                    
                    // Add all types of shows
                    this.addWeeklyShows(generatedSchedule, currentDate);
                    this.addWeekdayShows(generatedSchedule, currentDate);
                    this.addSpecialShows(generatedSchedule, currentDate);
                }
                
                // Sort by start time
                generatedSchedule.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
                
                // Check each show
                generatedSchedule.forEach(show => {
                    const startTime = new Date(show.startTime);
                    const isOnAir = this.isShowOnAir(show, now, generatedSchedule);
                    
                    console.log(
                        `Show: ${show.title}, ` +
                        `StartTime: ${startTime.toLocaleString()}, ` +
                        `On Air: ${isOnAir ? "YES" : "no"}`
                    );
                });
                
                // Find the currently playing show
                const currentShow = generatedSchedule.find(show => 
                    this.isShowOnAir(show, now, generatedSchedule)
                );
                
                if (currentShow) {
                    console.log("CURRENTLY ON AIR: ", currentShow.title, 
                        "at", new Date(currentShow.startTime).toLocaleString());
                } else {
                    console.log("NO SHOW CURRENTLY ON AIR");
                }
            })
            .catch(error => {
                console.error("Error in debugOnAirStatus:", error);
            });
    }
    
    /**
     * Create a show element
     */
    createShowElement(show, currentTime, allShows) {
        // Create the main container
        const element = document.createElement('div');
        
        try {
            // Detect if show is currently on air
            const isOnAir = this.isShowOnAir(show, currentTime, allShows);
            element.className = isOnAir ? 'schedule-item on-air' : 'schedule-item';
            
            // Extract basic show info with fallbacks
            const title = show.title || 'Untitled Show';
            const presenter = show.presenter || 'Unknown';
            const description = show.description || '';
            const imgSrc = show.image || '/player/NWR_text_logo_angle.png';
            
            // Format time - simplified version
            let timeStr = 'TBD';
            if (show.startTime) {
                const date = new Date(show.startTime);
                const hours = date.getHours() % 12 || 12;
                const mins = date.getMinutes().toString().padStart(2, '0');
                const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
                timeStr = `${hours}:${mins} ${ampm}`;
            }
            
            // Build HTML directly
            const html = `
                <div class="schedule-item-image">
                    <img src="${imgSrc}" alt="${title}">
                </div>
                <div class="schedule-item-content">
                    <div class="schedule-item-title-row">
                        <h3 class="schedule-item-title">${title}</h3>
                        <div class="schedule-item-time">
                            <span>${timeStr}</span>
                            <div class="on-air-badge">On Air</div>
                        </div>
                    </div>
                    <p class="schedule-item-presenter">with ${presenter}</p>
                    <p class="schedule-item-description">${description}</p>
                </div>
            `;
            
            element.innerHTML = html;
        } catch (error) {
            console.error('Error creating show element:', error);
            element.className = 'schedule-item error';
            element.textContent = 'Error displaying show';
        }
        
        return element;
    }
    
    /**
     * Debugging function to log HTML structure
     */
    inspectElement(element) {
        if (!element) return 'null';
        try {
            return {
                tagName: element.tagName,
                className: element.className,
                id: element.id,
                childNodes: element.childNodes.length,
                innerHTML: element.innerHTML.substring(0, 100) + '...',
                outerHTML: element.outerHTML.substring(0, 100) + '...'
            };
        } catch (e) {
            return 'Error inspecting: ' + e.message;
        }
    }
    
    
    /**
     * Format time for display with enhanced error handling
     */  
    formatTime(dateString) {
        try {
            const date = new Date(dateString);
            
            // Check if date is valid
            if (isNaN(date.getTime())) {
                console.warn('Invalid date for formatting:', dateString);
                return 'Time TBD';
            }
            
            let hours = date.getHours();
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            
            hours = hours % 12;
            hours = hours ? hours : 12; // Convert 0 to 12
            
            return `${hours}:${minutes} ${ampm}`;
        } catch (error) {
            console.error('Error formatting time:', error, dateString);
            return 'Time Error';
        }
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