/**
 * ScheduleManager - Enhanced version with improved On-Air detection
 */
class ScheduleManager {
    constructor(options = {}) {
        this.options = {
            scheduleUrl: './schedule.json',
            pollInterval: 900000, // 15 minutes
            daysToShow: 7, // Number of days to display in the schedule
            defaultArtwork: window.NWR_CONFIG?.defaultArtwork || '/player/NWR_text_logo_angle.png',
            debugMode: false, // Set to true to enable debug logging
            ...options
        };
        
        this.scheduleData = null;
        this.lastFetchTime = 0;
        this.fetchError = false;
        this.currentOnAirShow = null;
        
        // Cache DOM elements
        this.scheduleView = document.getElementById('scheduleView');
        
        // Make this instance available for debugging
        window.scheduleManager = this;
    }
    
    /**
     * Debug logging function that only logs when debugMode is enabled
     * @param {string} message - Message to log
     * @param {*} data - Optional data to log
     */
    debug(message, data) {
        if (this.options.debugMode) {
            if (data !== undefined) {
                console.log(`[ScheduleManager] ${message}`, data);
            } else {
                console.log(`[ScheduleManager] ${message}`);
            }
        }
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
        
        this.debug('Initializing schedule manager');
        
        // Add the schedule container to the view
        this.scheduleView.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'schedule-container';
        this.scheduleView.appendChild(container);
        this.scheduleContainer = container;
        
        // Initial schedule fetch - using try/catch to ensure proper error handling
        this.fetchSchedule()
            .then(() => this.debug('Initial schedule fetch complete'))
            .catch(err => console.error('Error during initial schedule fetch:', err));
        
        // Set up polling for schedule updates
        setInterval(() => this.fetchSchedule(), this.options.pollInterval);
        
        return this;
    }

    handleTabActivation() {
        this.debug('Schedule tab activated - handling activation');
        
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
            this.debug('Recreating schedule container');
            this.scheduleView.innerHTML = '';
            const container = document.createElement('div');
            container.className = 'schedule-container';
            this.scheduleView.appendChild(container);
            this.scheduleContainer = container;
        }
        
        // If we have cached schedule data, use it
        if (this.generatedSchedule && this.generatedSchedule.length > 0 && !this.fetchError) {
            this.debug('Using cached schedule data with', this.generatedSchedule.length, 'shows');
            const now = new Date();
            this.updateScheduleView(this.generatedSchedule, now);
        } 
        // Otherwise fetch fresh data
        else {
            this.debug('No cached data or previous error - fetching fresh schedule');
            this.fetchSchedule().catch(err => {
                console.error('Error fetching schedule from tab activation:', err);
                if (this.scheduleContainer) {
                    this.scheduleContainer.innerHTML = '<p class="no-data-message">Error loading schedule. Please try again later.</p>';
                }
            });
        }
    }
            
    /**
     * Fetch schedule data with improved error handling
     */
    async fetchSchedule() {
        // Reset fetch error flag
        this.fetchError = false;
        
        // Add cache-busting timestamp parameter
        const timestamp = new Date().getTime();
        const url = `${this.options.scheduleUrl}?t=${timestamp}`;
        
        this.debug('Fetching schedule from:', url);
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            this.debug('Schedule data parsed successfully');
            
            // Validate data structure
            if (!data || !data.weekly || !Array.isArray(data.weekly)) {
                throw new Error('Invalid schedule data format');
            }
            
            this.scheduleData = data;
            this.generateSchedule();
            return data;
            
        } catch (error) {
            console.error('Error fetching or parsing schedule:', error);
            this.fetchError = true;
            
            // Only use mock data when explicitly requested or in development
            if (this.options.useMockDataOnError || window.location.hostname === 'localhost') {
                console.warn('Using mock schedule data as fallback');
                this.scheduleData = await this.mockScheduleData();
                this.generateSchedule();
                return this.scheduleData;
            } else {
                // Show error to user but don't use mock data in production
                if (this.scheduleContainer) {
                    this.scheduleContainer.innerHTML = 
                        '<p class="error-message">Unable to load schedule. Please try again later.</p>';
                }
                throw error; // Re-throw to allow caller to handle
            }
        }
    }
                
    /**
     * Generate a schedule for the current week based on patterns
     */
    generateSchedule() {
        this.debug('Starting schedule generation');
        
        if (!this.scheduleData) {
            console.error('No schedule data available');
            if (this.scheduleContainer) {
                this.scheduleContainer.innerHTML = '<p class="no-data-message">Schedule information is currently unavailable</p>';
            }
            return;
        }
        
        // Get the current date
        const actualNow = new Date();
        this.debug('Current date/time:', actualNow.toISOString());
        
        // Start with actual today at midnight
        const today = new Date(actualNow.getFullYear(), actualNow.getMonth(), actualNow.getDate());
        this.debug('Today at midnight:', today.toISOString());
        
        // Generate schedule from patterns
        const generatedSchedule = [];
        
        try {
            // Generate schedule for each day
            for (let i = 0; i < this.options.daysToShow; i++) {
                const currentDate = new Date(today);
                currentDate.setDate(today.getDate() + i);
                
                const dayOfWeek = currentDate.getDay();
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                this.debug(`Processing ${dayNames[dayOfWeek]} (day ${dayOfWeek})`, currentDate.toISOString().split('T')[0]);
                
                // Add all types of shows
                this.addWeeklyShows(generatedSchedule, currentDate);
                this.addWeekdayShows(generatedSchedule, currentDate);
                this.addSpecialShows(generatedSchedule, currentDate);
            }
            
            this.debug(`Generated ${generatedSchedule.length} total shows`);
            
            if (generatedSchedule.length === 0) {
                console.warn('No shows were generated');
                if (this.scheduleContainer) {
                    this.scheduleContainer.innerHTML = '<p class="no-data-message">No scheduled shows for the upcoming week</p>';
                }
                return;
            }
            
            // Sort the schedule by start time
            generatedSchedule.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
            
            // Debug output for first few generated shows
            const showSample = generatedSchedule.slice(0, 5);
            this.debug('Sample of generated shows:', showSample.map(show => ({
                title: show.title,
                startTime: new Date(show.startTime).toLocaleString(),
                dayOfWeek: new Date(show.startTime).getDay(),
                presenter: show.presenter
            })));
            
            // Cache the generated schedule for reuse
            this.generatedSchedule = generatedSchedule;
            
            // Update the view
            this.updateScheduleView(generatedSchedule, actualNow);
            
        } catch (error) {
            console.error('Error in schedule generation:', error);
            this.fetchError = true;
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
                this.debug('No weekly shows data available');
                return;
            }
            
            const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            this.debug(`Looking for weekly shows on ${dayNames[dayOfWeek]} (day ${dayOfWeek})`);
            
            let showsAdded = 0;
            
            this.scheduleData.weekly.forEach((show, index) => {
                try {
                    if (show.day === undefined) {
                        console.warn(`Weekly show #${index} is missing the day property:`, show.title || 'Untitled');
                        return; // Skip this show
                    }
                    
                    // Explicitly log show details for debugging
                    this.debug(`Checking show "${show.title}" (day=${show.day}) against current day ${dayOfWeek}`);
                    
                    // Check if this show runs on this day of week
                    if (Number(show.day) === dayOfWeek) {
                        this.debug(`✓ Show "${show.title}" matches day ${dayOfWeek} (${dayNames[dayOfWeek]})`);
                        
                        if (!show.startTime) {
                            console.warn(`Show "${show.title}" is missing startTime property`);
                            return; // Skip this show
                        }
                        
                        // Create a date object for the show's start time on this date
                        try {
                            const [hours, minutes] = show.startTime.split(':').map(Number);
                            
                            // IMPORTANT: Create a new date object to avoid reference issues
                            const startTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
                            
                            // Ensure we're getting the correct day in the ISO string
                            const assignedDay = startTime.getDay();
                            if (assignedDay !== dayOfWeek) {
                                console.warn(`WARNING: Day mismatch for "${show.title}": expected ${dayOfWeek}, got ${assignedDay}`);
                            }
                            
                            // Store date information explicitly to aid debugging
                            schedule.push({
                                ...show,
                                startTime: startTime.toISOString(),
                                source: 'weekly',
                                // Add these debugging fields to help trace issues
                                _assignedDay: dayOfWeek,
                                _dayName: dayNames[dayOfWeek],
                                _dateStr: startTime.toDateString(),
                                _timeStr: startTime.toLocaleTimeString()
                            });
                            
                            showsAdded++;
                            this.debug(`Added weekly show "${show.title}" on ${startTime.toDateString()} at ${startTime.toLocaleTimeString()}`);
                        } catch (timeError) {
                            console.error(`Error processing time for "${show.title}":`, timeError);
                        }
                    }
                } catch (showError) {
                    console.error(`Error processing weekly show at index ${index}:`, showError);
                }
            });
            
            this.debug(`Added ${showsAdded} weekly shows for ${dayNames[dayOfWeek]}`);
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
                this.debug('No weekday shows data available');
                return;
            }
            
            const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            
            // Only add weekday shows for Monday through Friday (1-5)
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                this.debug(`Adding weekday shows for ${dayNames[dayOfWeek]} (day ${dayOfWeek})`);
                
                let showsAdded = 0;
                
                this.scheduleData.weekdays.forEach((show, index) => {
                    try {
                        if (!show.startTime) {
                            console.warn(`Weekday show #${index} is missing startTime property`);
                            return; // Skip this show
                        }
                        
                        // Create a date object for the show's start time on this date
                        try {
                            const [hours, minutes] = show.startTime.split(':').map(Number);
                            
                            // IMPORTANT: Create a new date object to avoid reference issues
                            const startTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
                            
                            // Add the show with explicit date information
                            schedule.push({
                                ...show,
                                startTime: startTime.toISOString(),
                                source: 'weekday',
                                // Add these debugging fields
                                _assignedDay: dayOfWeek,
                                _dayName: dayNames[dayOfWeek],
                                _dateStr: startTime.toDateString(),
                                _timeStr: startTime.toLocaleTimeString()
                            });
                            
                            showsAdded++;
                            this.debug(`Added weekday show "${show.title}" on ${startTime.toDateString()} at ${startTime.toLocaleTimeString()}`);
                        } catch (timeError) {
                            console.error(`Error processing time for weekday show "${show.title}":`, timeError);
                        }
                    } catch (showError) {
                        console.error(`Error processing weekday show at index ${index}:`, showError);
                    }
                });
                
                this.debug(`Added ${showsAdded} weekday shows for ${dayNames[dayOfWeek]}`);
            } else {
                this.debug(`Skipping weekday shows for ${dayNames[dayOfWeek]} (weekend)`);
            }
        } catch (error) {
            console.error('Error in addWeekdayShows:', error);
        }
    }
        
    /**
     * Add special one-time shows for a specific date
     */
    addSpecialShows(schedule, date) {
        try {
            if (!this.scheduleData.special || !Array.isArray(this.scheduleData.special) || this.scheduleData.special.length === 0) {
                this.debug('No special shows data available');
                return;
            }
            
            // Normalize date to start of day for comparison (YYYY-MM-DD)
            const dateStr = date.toISOString().split('T')[0];
            this.debug(`Looking for special shows on ${dateStr}`);
            
            let specialShowsAdded = 0;
            
            this.scheduleData.special.forEach((show, index) => {
                try {
                    if (!show.startTime) {
                        console.warn(`Special show #${index} is missing startTime:`, show.title || 'Untitled');
                        return;
                    }
                    
                    // Get date part of special show (YYYY-MM-DD)
                    const showDate = new Date(show.startTime);
                    
                    // Validate the date is valid
                    if (isNaN(showDate.getTime())) {
                        console.warn(`Special show "${show.title}" has invalid date: ${show.startTime}`);
                        return;
                    }
                    
                    const showDateStr = showDate.toISOString().split('T')[0];
                    
                    this.debug(`Checking special show "${show.title}" date ${showDateStr} against ${dateStr}`);
                    
                    // Check if this special show falls on the current date
                    if (showDateStr === dateStr) {
                        const dayOfWeek = date.getDay();
                        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        
                        schedule.push({
                            ...show,
                            source: 'special',
                            // Add debugging fields
                            _assignedDay: dayOfWeek,
                            _dayName: dayNames[dayOfWeek],
                            _dateStr: showDate.toDateString(),
                            _timeStr: showDate.toLocaleTimeString()
                        });
                        
                        specialShowsAdded++;
                        this.debug(`Added special show "${show.title}" on ${showDate.toDateString()} at ${showDate.toLocaleTimeString()}`);
                    }
                } catch (error) {
                    console.error(`Error processing special show at index ${index}:`, error);
                }
            });
            
            this.debug(`Added ${specialShowsAdded} special shows for ${dateStr}`);
        } catch (error) {
            console.error('Error in addSpecialShows:', error);
        }
    }
    
    /**
     * Update the schedule view with generated schedule
     * Enhanced to work both for full updates and on-air status updates only
     */
    updateScheduleView(schedule, actualNow) {
        this.debug('⭐⭐⭐ Starting schedule view update ⭐⭐⭐');
        
        // Fail fast if container not found
        if (!this.scheduleContainer) {
            console.error('Schedule container not found');
            return;
        }
        
        if (!schedule || !schedule.length) {
            this.scheduleContainer.innerHTML = '<p class="no-data-message">No shows available</p>';
            return;
        }
        
        // Check if we already have schedule items rendered
        const existingItems = this.scheduleContainer.querySelectorAll('.schedule-item');
        const isRefresh = existingItems.length > 0;
        
        // Find the current on-air show BEFORE we start updating the UI
        let currentOnAirShow = null;
        const currentDateStr = actualNow.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // First go through all of today's shows to find which is on air
        const todaysShows = schedule.filter(show => {
            if (!show.startTime) return false;
            const showDate = new Date(show.startTime);
            const showDateStr = showDate.toISOString().split('T')[0];
            return showDateStr === currentDateStr;
        });
        
        this.debug(`Found ${todaysShows.length} shows for today (${currentDateStr})`);
        
        // Sort today's shows by start time
        todaysShows.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        
        // Find the current show - the one that has started but the next one hasn't
        for (let i = 0; i < todaysShows.length; i++) {
            const show = todaysShows[i];
            const showStartTime = new Date(show.startTime);
            
            // If this show has started
            if (actualNow >= showStartTime) {
                // If there's a next show and it hasn't started yet
                if (i < todaysShows.length - 1) {
                    const nextShow = todaysShows[i + 1];
                    const nextShowStartTime = new Date(nextShow.startTime);
                    
                    if (actualNow < nextShowStartTime) {
                        currentOnAirShow = show;
                        break;
                    }
                } else {
                    // This is the last show of the day
                    currentOnAirShow = show;
                    break;
                }
            }
        }
        
        if (currentOnAirShow) {
            this.debug(`Current on-air show: ${currentOnAirShow.title} at ${new Date(currentOnAirShow.startTime).toLocaleTimeString()}`);
        } else {
            this.debug('No show currently on air');
        }
        
        // Cache the current on-air show
        this.currentOnAirShow = currentOnAirShow;
        
        if (!isRefresh) {
            // FULL REBUILD - Clear existing content completely
            this.scheduleContainer.innerHTML = '';
            
            // Group shows by date - USING PROPER DATE HANDLING
            const groupedShows = {};
            
            schedule.forEach(show => {
                if (!show.startTime) return;
                
                // Create a date object from the ISO string
                const showDate = new Date(show.startTime);
                
                // Use the show's assigned day info if available
                const dateKey = show._dateStr || showDate.toDateString();
                
                if (!groupedShows[dateKey]) {
                    groupedShows[dateKey] = {
                        date: showDate,
                        shows: []
                    };
                }
                
                groupedShows[dateKey].shows.push(show);
            });
            
            // Get date keys and sort chronologically
            const dateKeys = Object.keys(groupedShows);
            dateKeys.sort((a, b) => new Date(a) - new Date(b));
            
            this.debug('Processing dates:', dateKeys);
            
            // Process each date group
            dateKeys.forEach(dateKey => {
                const dateGroup = groupedShows[dateKey];
                const dateObj = dateGroup.date;
                const shows = dateGroup.shows;
                
                this.debug(`Adding date header for ${dateKey} with ${shows.length} shows`);
                
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
                        // For on-air detection, now check against our pre-determined currentOnAirShow
                        const isOnAir = currentOnAirShow && show.startTime === currentOnAirShow.startTime;
                        const showElement = this.createShowElement(show, isOnAir);
                        this.scheduleContainer.appendChild(showElement);
                    } catch (e) {
                        console.error('Failed to create show element:', e);
                    }
                });
            });
        }
        else {
            // REFRESH ONLY - Just update the "on air" status of existing items
            this.debug('Refreshing "On Air" status of existing schedule items');
            
            // First, remove on-air class from all items
            existingItems.forEach(item => {
                item.classList.remove('on-air');
            });
            
            // If we have a current show, find and highlight it
            if (currentOnAirShow) {
                const currentShowStartTime = new Date(currentOnAirShow.startTime).toISOString();
                
                // Find the element for the current show using the unique show ID and start time
                const onAirElement = Array.from(existingItems).find(item => {
                    const itemId = item.getAttribute('data-show-id');
                    const itemStartTime = item.getAttribute('data-start-time');
                    return String(itemId) === String(currentOnAirShow.id) && itemStartTime === currentShowStartTime;
                });
                
                if (onAirElement) {
                    onAirElement.classList.add('on-air');
                    this.debug(`Found and highlighted on-air show: ${currentOnAirShow.title}`);
                    
                    // Scroll to the element with a small offset if we're on the schedule tab
                    if (this.viewManager && this.viewManager.getCurrentTab() === 'schedule') {
                        onAirElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                } else {
                    console.warn(`Could not find element for on-air show: ${currentOnAirShow.title}`);
                }
            }
        }
        
        this.debug('Schedule view update complete');
    }
 
    /* Check if a show is currently on air */
    isShowOnAir(show, currentTime, allShows) {
        try {
            // For debugging
            const debugging = show.title === "Tracks From the Dark Side" && this.options.debugMode;
            
            if (debugging) {
                this.debug("==== CHECKING ON-AIR STATUS FOR TRACKED SHOW ====");
                this.debug("Current time:", currentTime.toLocaleString());
            }
            
            if (!show.startTime) {
                if (debugging) this.debug("No start time, not on air");
                return false;
            }
            
            const showStartTime = new Date(show.startTime);
            
            if (debugging) {
                this.debug("Show start time:", showStartTime.toLocaleString());
                this.debug("Has show started?", currentTime >= showStartTime);
            }
            
            // If show hasn't started yet, it's not on air
            if (currentTime < showStartTime) {
                return false;
            }
            
            // Use the date string for comparison (not ISO string) to account for timezone issues
            const showDateStr = showStartTime.toDateString();
            
            // Find all shows on the same day
            const sameDayShows = allShows.filter(s => {
                if (!s.startTime) return false;
                const sDate = new Date(s.startTime);
                return sDate.toDateString() === showDateStr;
            });
            
            if (debugging) {
                this.debug(`Found ${sameDayShows.length} shows on the same day`);
            }
            
            // Sort by start time
            const sortedShows = sameDayShows.sort((a, b) => 
                new Date(a.startTime) - new Date(b.startTime)
            );
            
            // Find the position of the current show
            const currentIndex = sortedShows.findIndex(s => 
                s.id === show.id && 
                new Date(s.startTime).getTime() === showStartTime.getTime()
            );
            
            if (debugging) {
                this.debug(`Show position in day's lineup: ${currentIndex + 1} of ${sortedShows.length}`);
            }
            
            if (currentIndex === -1) {
                if (debugging) this.debug("Show not found in sorted list");
                return false;
            }
            
            // If there's a next show, check if current time is before it starts
            if (currentIndex < sortedShows.length - 1) {
                const nextShow = sortedShows[currentIndex + 1];
                const nextShowStart = new Date(nextShow.startTime);
                
                if (debugging) {
                    this.debug(`Next show: ${nextShow.title} at ${nextShowStart.toLocaleString()}`);
                    this.debug(`Is before next show? ${currentTime < nextShowStart}`);
                }
                
                return currentTime < nextShowStart;
            }
            
            // If it's the last show of the day, it's on air until end of the day
            const endOfDay = new Date(showDateStr);
            endOfDay.setHours(23, 59, 59, 999);
            
            if (debugging) {
                this.debug(`Last show of the day, on until ${endOfDay.toLocaleString()}`);
                this.debug(`Is before end of day? ${currentTime <= endOfDay}`);
            }
            
            return currentTime <= endOfDay;
        } catch (error) {
            console.error('Error in isShowOnAir:', error, show);
            return false;
        }
    }
    
    /**
     * Create a show element
     */
    createShowElement(show, isOnAir) {
        // Create the main container
        const element = document.createElement('div');
        
        try {
            element.className = isOnAir ? 'schedule-item on-air' : 'schedule-item';
            
            // Add data attributes for identification and updates
            element.setAttribute('data-show-id', show.id);
            element.setAttribute('data-start-time', new Date(show.startTime).toISOString());
            
            if (show._assignedDay !== undefined) {
                element.dataset.assignedDay = show._assignedDay;
                element.dataset.dayName = show._dayName || '';
            }
            element.dataset.source = show.source || 'unknown';
            
            // Extract basic show info with fallbacks
            const title = show.title || 'Untitled Show';
            const presenter = show.presenter || 'Unknown';
            const description = show.description || '';
            const imgSrc = show.image || this.options.defaultArtwork;
            
            // Format time with AM/PM
            let timeStr = 'TBD';
            if (show.startTime) {
                const date = new Date(show.startTime);
                const hours = date.getHours() % 12 || 12; // Convert 0 to 12 for 12 AM
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
     * Get the currently on-air show, if any
     */
    getCurrentOnAirShow() {
        // If we already have a cached on-air show, return it
        if (this.currentOnAirShow) {
            const now = new Date();
            // Check if it's still on air
            if (this.isShowOnAir(this.currentOnAirShow, now, this.generatedSchedule)) {
                return this.currentOnAirShow;
            }
        }
        
        // Otherwise, find the current on-air show
        if (this.generatedSchedule && this.generatedSchedule.length > 0) {
            const now = new Date();
            const onAirShow = this.generatedSchedule.find(show => 
                this.isShowOnAir(show, now, this.generatedSchedule)
            );
            
            // Cache it for future reference
            this.currentOnAirShow = onAirShow || null;
            return this.currentOnAirShow;
        }
        
        return null;
    }
    
    /**
     * Mock schedule data for testing - only use as last resort
     */
    async mockScheduleData() {
        console.warn('⚠️ Using mock schedule data - this should only happen in development ⚠️');
        this.debug('Loading mock schedule data');
        return {
            "weekly": [
                {
                    "id": 0,
                    "title": "Now Wave Mix",
                    "presenter": "Now Wave Radio",
                    "description": "",
                    "image": "/player/NWR_text_logo_angle.png",
                    "day": 0,
                    "startTime": "00:00"
                },
                {
                    "id": 2,
                    "title": "Freethought Radio",
                    "presenter": "FFRF",
                    "description": "Talk from Alternative Listeners",
                    "image": "/player/NWR_text_logo_angle.png",
                    "day": 0,
                    "startTime": "08:00"
                },
                {
                    "id": 3,
                    "title": "Sunday Slowdown",
                    "presenter": "Now Wave Radio",
                    "description": "Lighter Tracks. Slower Melodies.",
                    "image": "/player/NWR_text_logo_angle.png",
                    "day": 0,
                    "startTime": "09:00"
                }
            ],
            "weekdays": [
                {
                    "id": 8,
                    "title": "Steve Machine",
                    "presenter": "Steve",
                    "description": "",
                    "image": "/player/NWR_text_logo_angle.png",
                    "startTime": "00:00"
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