<?php 
// Get navigation data for the template
$navData = getDateNavigation();
?>
<?php include 'header.php'; ?>

<div class="container">
    <div class="dashboard-header">
        <h1>Now Wave Radio Analytics</h1>
        <div>
            <span>Data updated: <?= date('Y-m-d H:i:s') ?></span>
            <a href="?logout=1" class="logout-button">Logout</a>
        </div>
    </div>
    
    <?php if (!$dashboardData['sqliteAvailable']): ?>
        <div class="alert alert-warning">
            <strong>Warning:</strong> SQLite3 extension is not installed. Analytics features are disabled.
            <p>To enable analytics, please install SQLite3 extension for PHP:</p>
            <pre>sudo apt-get install php-sqlite3</pre>
            <p>Then restart your web server.</p>
        </div>
    <?php endif; ?>
    
    <div class="stats-container">
        <div class="stat-card">
            <div class="stat-value"><?= $dashboardData['actionCounts']['play'] ?? 0 ?></div>
            <div class="stat-label">Total Plays</div>
        </div>
        <div class="stat-card">
            <div class="stat-value"><?= max(0, $dashboardData['actionCounts']['like'] - ($dashboardData['actionCounts']['unlike'] ?? 0)) ?></div>
            <div class="stat-label">Net Likes</div>
        </div>
        <div class="stat-card">
            <div class="stat-value"><?= $dashboardData['totalTracks'] ?></div>
            <div class="stat-label">Tracked Tracks</div>
        </div>
        <div class="stat-card">
            <div class="stat-value"><?= count($dashboardData['dailyActions']) ?></div>
            <div class="stat-label">Days with Activity</div>
        </div>
    </div>
    
    <h2>Popular Tracks</h2>
    <?php if (count($dashboardData['popularTracks']) > 0): ?>
        <table>
            <thead>
                <tr>
                    <th>Track</th>
                    <th>Artist</th>
                    <th>Title</th>
                    <th>Likes</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($dashboardData['popularTracks'] as $track): ?>
                    <tr>
                        <td>
                            <img src="/player/publish/ca/<?= $track['hash'] ?>.jpg" 
                                 class="track-image"
                                 onerror="this.src='/player/NWR_text_logo_angle.png';">
                        </td>
                        <td><?= htmlspecialchars($track['artist']) ?></td>
                        <td><?= htmlspecialchars($track['title']) ?></td>
                        <td><?= $track['net_likes'] ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php else: ?>
        <p>No popular tracks found.</p>
    <?php endif; ?>
    
    <h2>Daily Activity (<?php echo date_default_timezone_get(); ?> Timezone)</h2>
    <div class="daily-activity-container">
        <table id="dailyActivityTable" data-selected-date="<?= $dashboardData['selectedDate'] ?>">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Plays</th>
                    <th>Stops</th>
                    <th>Likes</th>
                    <th>Unlikes</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($dashboardData['dailyActions'] as $day => $counts): ?>
                    <tr data-date="<?= $day ?>" class="<?= ($day === $dashboardData['selectedDate']) ? 'selected-date' : '' ?>">
                        <td><?= date('M j, Y', strtotime($day)) ?></td>
                        <td><?= $counts['play'] ?></td>
                        <td><?= $counts['stop'] ?></td>
                        <td><?= $counts['like'] ?></td>
                        <td><?= $counts['unlike'] ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    
    <!-- Hourly Activity Chart -->
    <h2>Hourly Activity Chart</h2>
    
    <div class="date-nav-container">
        <!-- Previous Day Button -->
        <button id="prevDayBtn" class="date-nav-button" onclick="changeDate('prev')" <?= (!$navData['prevDate']) ? 'disabled' : '' ?>>
            &larr; Previous Day
        </button>
        
        <!-- Date Picker -->
        <div class="date-picker-container">
            <span id="currentDateDisplay" class="current-date-display"><?= $navData['formattedDate'] ?></span>
            <select id="datePicker" class="date-picker" onchange="changeDate('select', this.value)">
                <?php foreach ($dashboardData['availableDates'] as $date): ?>
                    <option value="<?= $date ?>" <?= ($date === $dashboardData['selectedDate']) ? 'selected' : '' ?>>
                        <?= date('Y-m-d', strtotime($date)) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>
        
        <!-- Next Day Button -->
        <button id="nextDayBtn" class="date-nav-button" onclick="changeDate('next')" <?= (!$navData['nextDate']) ? 'disabled' : '' ?>>
            Next Day &rarr;
        </button>
    </div>
    
    <div class="chart-container">
        <canvas id="hourlyActivityChart"></canvas>
    </div>
    
    <h2>Database Information</h2>
    <p>Database location: <?= $dashboardData['dbPath'] ?: 'Unknown' ?></p>
    
    <!-- JavaScript data variables for chart initialization -->
    <script>
        // Store the available dates and current index for navigation
        const availableDates = <?= json_encode($dashboardData['availableDates']) ?>;
        let currentDateIndex = <?= $navData['currentIndex'] ?>;
        
        // Prepare the initial data for the chart
        const hours = <?php echo json_encode(array_keys($dashboardData['hourlyActions'])); ?>;
        const plays = <?php echo json_encode(array_column($dashboardData['hourlyActions'], 'play')); ?>;
        const stops = <?php echo json_encode(array_column($dashboardData['hourlyActions'], 'stop')); ?>;
        const likes = <?php echo json_encode(array_column($dashboardData['hourlyActions'], 'like')); ?>;
        const unlikes = <?php echo json_encode(array_column($dashboardData['hourlyActions'], 'unlike')); ?>;
        const formattedDate = '<?php echo $navData['formattedDate']; ?>';
    </script>
    <script src="/player/php/assets/js/analytics_dashboard.js"></script>
</div>

</body>
</html>