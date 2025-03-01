/**
 * Generate a schedule for the current week based on patterns - with extensive debug info
 */
generateSchedule() {
    console.log('Starting schedule generation');
    
    if (!this.scheduleData) {
        console.error('No schedule data available');
        this.scheduleContainer.innerHTML = '<p class="no-data-message">Schedule information is currently unavailable</p>';
        return;
    }
    
    console.log('Schedule data structure:', JSON.stringify(this.scheduleData).substring(0, 100) + '...');
    
    // Start with today
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    console.log('Base date for schedule:', today.toISOString());
    
    const generatedSchedule = [];
    
    // Generate schedule for the specified number of days
    try {
        for (let i = 0; i < this.options.daysToShow; i++) {
            const currentDate = new Date(today);
            currentDate.setDate(today.getDate() + i);
            console.log(`Processing day ${i+1}: ${currentDate.toISOString()}`);
            
            try {
                // Add weekly shows for this day of week
                this.addWeeklyShows(generatedSchedule, currentDate);
                
                // Add weekday shows (Mon-Fri)
                this.addWeekdayShows(generatedSchedule, currentDate);
                
                // Add special shows that fall on this date
                this.addSpecialShows(generatedSchedule, currentDate);
            } catch (dayError) {
                console.error(`Error processing day ${i+1}:`, dayError);
                // Continue with next day despite errors
            }
        }
        
        console.log(`Generated ${generatedSchedule.length} total shows`);
        
        if (generatedSchedule.length === 0) {
            console.warn('No shows were generated');
            this.scheduleContainer.innerHTML = '<p class="no-data-message">No scheduled shows for the upcoming week</p>';
            return;
        }
        
        // Sort the schedule by start time
        generatedSchedule.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        
        // Update the view with the generated schedule
        this.updateScheduleView(generatedSchedule);
        
    } catch (error) {
        console.error('Error in schedule generation:', error);
        this.scheduleContainer.innerHTML = '<p class="no-data-message">Error generating schedule</p>';
    }
}

/**
 * Add weekly shows for a specific date - with defensive coding
 */
addWeeklyShows(schedule, date) {
    try {
        if (!this.scheduleData.weekly || !Array.isArray(this.scheduleData.weekly) || this.scheduleData.weekly.length === 0) {
            console.log('No weekly shows data available');
            return;
        }
        
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        console.log(`Looking for shows on day ${dayOfWeek}`);
        
        this.scheduleData.weekly.forEach((show, index) => {
            try {
                if (show.day === undefined) {
                    console.warn(`Show #${index} is missing the day property:`, show);
                    return; // Skip this show
                }
                
                // Check if this show runs on this day of week
                if (show.day === dayOfWeek) {
                    console.log(`Found show "${show.title}" for day ${dayOfWeek}`);
                    
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
                        
                        console.log(`Added weekly show "${show.title}" at ${startTime.toISOString()}`);
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
 * Add weekday shows (Mon-Fri) for a specific date - with defensive coding
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
 * Update the schedule view with generated schedule - with defensive coding
 */
updateScheduleView(schedule) {
    try {
        console.log('Updating schedule view with', schedule.length, 'shows');
        
        if (!schedule || !schedule.length) {
            this.scheduleContainer.innerHTML = '<p class="no-data-message">No scheduled shows for the upcoming week</p>';
            return;
        }
        
        // Group shows by date
        const groupedShows = this.groupShowsByDate(schedule);
        console.log('Grouped shows by date:', Object.keys(groupedShows));
        
        // Clear the container
        this.scheduleContainer.innerHTML = '';
        
        // Get current date and time for "On Air" status
        const now = new Date();
        
        // Process each date group
        Object.keys(groupedShows).forEach(dateKey => {
            try {
                const shows = groupedShows[dateKey];
                const dateObj = new Date(dateKey);
                
                console.log(`Creating date header for ${dateKey} with ${shows.length} shows`);
                
                // Create date header
                const dateHeader = document.createElement('div');
                dateHeader.className = 'date-header';
                dateHeader.innerHTML = `<h2>${this.formatDateHeader(dateObj)}</h2>`;
                this.scheduleContainer.appendChild(dateHeader);
                
                // Create show items
                shows.forEach((show, index) => {
                    try {
                        const showElement = this.createShowElement(show, now, schedule);
                        this.scheduleContainer.appendChild(showElement);
                    } catch (showError) {
                        console.error(`Error creating show element for show #${index} on ${dateKey}:`, showError);
                    }
                });
            } catch (dateError) {
                console.error(`Error processing date group ${dateKey}:`, dateError);
            }
        });
        
        console.log('Schedule view update complete');
    } catch (error) {
        console.error('Error in updateScheduleView:', error);
        this.scheduleContainer.innerHTML = '<p class="no-data-message">Error displaying schedule</p>';
    }
}

/**
 * Create a show element - with defensive coding
 */
createShowElement(show, currentTime, allShows) {
    try {
        const isOnAir = this.isShowOnAir(show, currentTime, allShows);
        
        const showElement = document.createElement('div');
        showElement.className = `schedule-item${isOnAir ? ' on-air' : ''}`;
        
        // Safe access to properties with fallbacks
        const title = show.title || 'Untitled Show';
        const presenter = show.presenter || 'Unknown Presenter';
        const description = show.description || '';
        const image = show.image || '/player/NWR_text_logo_angle.png';
        const formattedTime = this.formatTime(show.startTime);
        
        showElement.innerHTML = `
            <div class="schedule-item-image">
                <img src="${image}" alt="${title}">
            </div>
            <div class="schedule-item-content">
                <div class="schedule-item-title-row">
                    <h3 class="schedule-item-title">${title}</h3>
                    <div class="schedule-item-time">
                        <span>${formattedTime}</span>
                        <div class="on-air-badge">On Air</div>
                    </div>
                </div>
                <p class="schedule-item-presenter">with ${presenter}</p>
                <p class="schedule-item-description">${description}</p>
            </div>
        `;
        
        return showElement;
    } catch (error) {
        console.error('Error creating show element:', error);
        // Return a minimal error element instead of failing completely
        const errorElement = document.createElement('div');
        errorElement.className = 'schedule-item error';
        errorElement.innerHTML = '<p>Error displaying show</p>';
        return errorElement;
    }
}

/**
 * Check if a show is currently on air - with robust error handling
 */
isShowOnAir(show, currentTime, allShows) {
    try {
        if (!show.startTime) {
            console.warn('Show missing startTime in isShowOnAir check:', show);
            return false;
        }
        
        const startTime = new Date(show.startTime);
        
        // If current time is before the show starts, it's not on air
        if (currentTime < startTime) {
            return false;
        }
        
        // Find the next show after this one on the same day
        const showDate = startTime.toISOString().split('T')[0];
        
        // Filter shows on the same day with valid startTime
        const sameDayShows = (allShows || []).filter(s => {
            if (!s || !s.startTime) return false;
            try {
                const sTime = new Date(s.startTime);
                const sDate = sTime.toISOString().split('T')[0];
                return sDate === showDate;
            } catch (e) {
                return false;
            }
        });
        
        if (sameDayShows.length === 0) {
            console.warn('No valid shows found for day in isShowOnAir:', showDate);
            return false;
        }
        
        // Sort shows by start time
        const sortedShows = [...sameDayShows].sort((a, b) => {
            try {
                return new Date(a.startTime) - new Date(b.startTime);
            } catch (e) {
                return 0;
            }
        });
        
        // Find the current show's index
        const currentIndex = sortedShows.findIndex(s => s.id === show.id);
        if (currentIndex === -1) {
            console.warn('Show not found in sorted list:', show.id);
            return false;
        }
        
        // Check if there's a next show
        const nextShow = sortedShows[currentIndex + 1];
        
        // If there is a next show, check if current time is before it starts
        if (nextShow && nextShow.startTime) {
            const nextShowStart = new Date(nextShow.startTime);
            return currentTime < nextShowStart;
        }
        
        // If this is the last show of the day, consider it on air until end of day
        const endOfDay = new Date(startTime);
        endOfDay.setHours(23, 59, 59, 999);
        
        return currentTime <= endOfDay;
    } catch (error) {
        console.error('Error in isShowOnAir:', error);
        return false; // Default to not on air if there's an error
    }
}