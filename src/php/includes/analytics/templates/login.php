<?php include 'header.php'; ?>

<div class="container">
    <div class="login-container">
        <div class="login-header">
            <h2>Now Wave Radio Analytics</h2>
            <p>Please log in to access the dashboard</p>
        </div>
        
        <?php if ($dashboardData['loginError']): ?>
            <div class="error-message"><?= htmlspecialchars($dashboardData['loginError']) ?></div>
        <?php endif; ?>
        
        <form method="post" action="">
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" required autocomplete="username">
            </div>
            
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required autocomplete="current-password">
            </div>
            
            <button type="submit" class="login-button" name="login" value="1">Login</button>
        </form>
    </div>
</div>

</body>
</html>