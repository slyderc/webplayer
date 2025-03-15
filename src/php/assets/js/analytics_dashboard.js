/**
 * Analytics Dashboard JavaScript
 * Handles interactive functionality for the analytics dashboard
 */

let hourlyChart; // Global chart instance

// Function to change the date and update the chart
function changeDate(action, selectedDate = null) {
    let newDate;
    
    // Determine the new date based on action
    if (action === 'prev' && currentDateIndex < availableDates.length - 1) {
        currentDateIndex++;
        newDate = availableDates[currentDateIndex];
        
        // Enable/disable navigation buttons
        document.getElementById('nextDayBtn').disabled = currentDateIndex <= 0;
        document.getElementById('prevDayBtn').disabled = currentDateIndex >= availableDates.length - 1;
        
    } else if (action === 'next' && currentDateIndex > 0) {
        currentDateIndex--;
        newDate = availableDates[currentDateIndex];
        
        // Enable/disable navigation buttons
        document.getElementById('nextDayBtn').disabled = currentDateIndex <= 0;
        document.getElementById('prevDayBtn').disabled = currentDateIndex >= availableDates.length - 1;
        
    } else if (action === 'select') {
        newDate = selectedDate;
        
        // Find the index of the new date
        const newIndex = availableDates.indexOf(newDate);
        if (newIndex !== -1) {
            currentDateIndex = newIndex;
            
            // Enable/disable navigation buttons
            document.getElementById('nextDayBtn').disabled = currentDateIndex <= 0;
            document.getElementById('prevDayBtn').disabled = currentDateIndex >= availableDates.length - 1;
        }
    } else {
        return; // Invalid action or boundary reached
    }
    
    // Update the dropdown selection
    document.getElementById('datePicker').value = newDate;
    
    // Show loading state
    document.querySelector('.chart-container').classList.add('loading');
    
    // Highlight the corresponding row in the table
    highlightTableRow(newDate);
    
    // Fetch the new date's data
    fetchChartData(newDate);
}

// Function to fetch chart data via AJAX
function fetchChartData(date) {
    fetch('hourly_data.php?date=' + date)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            updateChart(data);
        })
        .catch(error => {
            console.error('Error fetching chart data:', error);
        })
        .finally(() => {
            document.querySelector('.chart-container').classList.remove('loading');
        });
}

// Function to update the chart with new data
function updateChart(data) {
    // Update the formatted date display
    document.getElementById('currentDateDisplay').textContent = data.formattedDate;
    
    if (hourlyChart) {
        // Update existing chart
        hourlyChart.data.labels = data.chartData.hours;
        hourlyChart.data.datasets[0].data = data.chartData.plays;
        hourlyChart.data.datasets[1].data = data.chartData.stops;
        hourlyChart.data.datasets[2].data = data.chartData.likes;
        hourlyChart.data.datasets[3].data = data.chartData.unlikes;
        
        // Update the chart title
        hourlyChart.options.plugins.title.text = 'Hourly Activity Distribution for ' + data.formattedDate;
        
        // Update the chart
        hourlyChart.update();
    }
}

// Function to highlight the selected date in the table
function highlightTableRow(date) {
    // Remove highlight from all rows
    const allRows = document.querySelectorAll('#dailyActivityTable tbody tr');
    allRows.forEach(row => row.classList.remove('selected-date'));
    
    // Add highlight to the selected row
    const selectedRow = document.querySelector(`#dailyActivityTable tbody tr[data-date="${date}"]`);
    if (selectedRow) {
        selectedRow.classList.add('selected-date');
        
        // Scroll the row into view (with some margin)
        const container = document.querySelector('.daily-activity-container');
        const rowTop = selectedRow.offsetTop;
        const containerHeight = container.clientHeight;
        const scrollPosition = rowTop - (containerHeight / 2) + (selectedRow.clientHeight / 2);
        
        container.scrollTo({
            top: Math.max(0, scrollPosition),
            behavior: 'smooth'
        });
    }
}

// Initialize the chart and table interactions on page load
document.addEventListener('DOMContentLoaded', function() {
    // Add click event listeners to table rows
    const tableRows = document.querySelectorAll('#dailyActivityTable tbody tr');
    tableRows.forEach(row => {
        row.addEventListener('click', function() {
            const date = this.getAttribute('data-date');
            
            // Update the date picker
            document.getElementById('datePicker').value = date;
            
            // Find index in available dates
            const newIndex = availableDates.indexOf(date);
            if (newIndex !== -1) {
                currentDateIndex = newIndex;
                
                // Update navigation buttons
                document.getElementById('nextDayBtn').disabled = currentDateIndex <= 0;
                document.getElementById('prevDayBtn').disabled = currentDateIndex >= availableDates.length - 1;
            }
            
            // Highlight the clicked row
            highlightTableRow(date);
            
            // Fetch and update chart
            fetchChartData(date);
        });
    });
    
    // Scroll the selected date into view on initial load
    setTimeout(() => {
        const selectedDate = document.querySelector('#dailyActivityTable').getAttribute('data-selected-date');
        highlightTableRow(selectedDate);
    }, 100);
    
    // Create the chart
    initializeChart();
});

// Function to initialize the chart
function initializeChart() {
    // Get the canvas element
    const ctx = document.getElementById('hourlyActivityChart').getContext('2d');
    
    // Create the chart
    hourlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hours,
            datasets: [
                {
                    label: 'Plays',
                    data: plays,
                    backgroundColor: 'rgba(53, 122, 232, 0.8)',
                    borderColor: 'rgba(53, 122, 232, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    maxBarThickness: 20
                },
                {
                    label: 'Stops',
                    data: stops,
                    backgroundColor: 'rgba(255, 153, 0, 0.8)',
                    borderColor: 'rgba(255, 153, 0, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    maxBarThickness: 20
                },
                {
                    label: 'Likes',
                    data: likes,
                    backgroundColor: 'rgba(220, 53, 89, 0.8)',
                    borderColor: 'rgba(220, 53, 89, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    maxBarThickness: 20
                },
                {
                    label: 'Unlikes',
                    data: unlikes,
                    backgroundColor: 'rgba(75, 192, 192, 0.8)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    maxBarThickness: 20
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Hourly Activity Distribution for ' + formattedDate,
                    font: {
                        size: 18
                    }
                },
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        title: function(tooltipItems) {
                            return 'Hour: ' + tooltipItems[0].label + ':00 - ' + tooltipItems[0].label + ':59';
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Hour of Day (24-hour format)',
                        font: {
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Actions',
                        font: {
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}