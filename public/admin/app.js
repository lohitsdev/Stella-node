// Admin Dashboard JavaScript

class AdminDashboard {
    constructor() {
        this.apiBaseUrl = '/api';
        this.token = localStorage.getItem('adminToken');
        this.refreshInterval = null;
        this.charts = {};
        
        // User tracking properties
        this.userEmail = null;
        this.sessionId = null;
        this.pageStartTime = Date.now();
        this.currentPage = '/admin/';
        this.idleTimer = null;
        this.idleThreshold = 60000; // 1 minute
        this.isTracking = false;
        
        this.init();
        this.initializeTracking();
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.dataset.section || e.target.closest('.nav-link').dataset.section;
                this.showSection(section);
            });
        });

        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.refreshCurrentSection();
        });

        // Environment variable tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterEnvironmentVariables(e.target.dataset.category);
            });
        });

        // Environment variable save
        document.getElementById('save-env-btn').addEventListener('click', () => {
            this.saveEnvironmentVariables();
        });

        // App restart
        document.getElementById('restart-app-btn').addEventListener('click', () => {
            this.restartApplication();
        });

        // Log level filter
        document.getElementById('log-level-filter').addEventListener('change', (e) => {
            this.filterLogs(e.target.value);
        });

        // User filters
        document.getElementById('user-role-filter')?.addEventListener('change', () => {
            this.loadUsers(1); // Reset to page 1
        });

        document.getElementById('user-status-filter')?.addEventListener('change', () => {
            this.loadUsers(1); // Reset to page 1
        });

        // User search with debounce
        let searchTimeout;
        document.getElementById('user-search')?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.loadUsers(1); // Reset to page 1
            }, 500);
        });
    }

    async checkAuth() {
        if (!this.token) {
            this.showLogin();
            return;
        }

        try {
            const response = await this.apiCall('/auth/verify', 'GET');
            if (response.success) {
                this.hideLogin();
                this.startDashboard();
            } else {
                this.showLogin();
            }
        } catch (error) {
            this.showLogin();
        }
    }

    async login() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            this.showLoading(true);
            
            // Try JWT authentication first
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success && (data.data.user.role === 'admin' || data.data.user.role === 'ADMIN')) {
                this.token = data.data.tokens.accessToken;
                this.userEmail = email;
                localStorage.setItem('adminToken', this.token);
                this.hideLogin();
                this.startDashboard();
                this.showToast('Login successful!', 'success');
                
                // Start comprehensive user tracking
                await this.startTrackingSession(this.userEmail);
                return;
            }

            // If JWT fails, try fallback authentication for admin@stella.com/admin
            if (email === 'admin@stella.com' && password === 'admin') {
                // Use Basic Auth as fallback
                const credentials = btoa('admin:admin');
                this.token = `Basic ${credentials}`;
                this.userEmail = 'admin@stella.com';
                localStorage.setItem('adminToken', this.token);
                this.hideLogin();
                this.startDashboard();
                this.showToast('Login successful with fallback credentials!', 'success');
                
                // Start comprehensive user tracking
                await this.startTrackingSession(this.userEmail);
                return;
            }

            this.showToast('Invalid credentials or admin access required', 'error');
        } catch (error) {
            // Try fallback if network error and credentials are admin@stella.com/admin
            if (email === 'admin@stella.com' && password === 'admin') {
                const credentials = btoa('admin:admin');
                this.token = `Basic ${credentials}`;
                this.userEmail = 'admin@stella.com';
                localStorage.setItem('adminToken', this.token);
                this.hideLogin();
                this.startDashboard();
                this.showToast('Using fallback authentication!', 'warning');
                
                // Start comprehensive user tracking
                await this.startTrackingSession(this.userEmail);
                return;
            }
            this.showToast('Login failed', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    logout() {
        this.token = null;
        localStorage.removeItem('adminToken');
        this.showLogin();
        this.stopRefresh();
    }

    showLogin() {
        document.getElementById('login-modal').classList.add('active');
    }

    hideLogin() {
        document.getElementById('login-modal').classList.remove('active');
    }

    startDashboard() {
        this.showSection('dashboard');
        this.loadDashboardData();
        this.startRefresh();
    }

    stopRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    startRefresh() {
        this.stopRefresh();
        this.refreshInterval = setInterval(() => {
            this.refreshCurrentSection();
        }, 30000); // Refresh every 30 seconds
    }

    showSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Show section
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${sectionName}-section`).classList.add('active');

        // Load section data
        switch (sectionName) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'environment':
                this.loadEnvironmentVariables();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
            case 'services':
                this.loadServiceStatus();
                break;
            case 'logs':
                this.loadLogs();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'ai-usage':
                this.loadAIUsage();
                break;
            case 'database':
                this.loadDatabaseStats();
                break;
            case 'performance':
                this.loadPerformanceMetrics();
                break;
            case 'security':
                this.loadSecurityEvents();
                break;
        }
    }

    refreshCurrentSection() {
        const activeSection = document.querySelector('.nav-link.active').dataset.section;
        this.showSection(activeSection);
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        // Handle both Bearer tokens and Basic auth
        if (this.token) {
            if (this.token.startsWith('Basic ')) {
                options.headers['Authorization'] = this.token;
            } else {
                options.headers['Authorization'] = `Bearer ${this.token}`;
            }
        }

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${this.apiBaseUrl}${endpoint}`, options);
        return await response.json();
    }

    async loadDashboardData() {
        try {
            const response = await this.apiCall('/admin/dashboard');
            if (response.success) {
                this.updateDashboard(response.data);
            }
        } catch (error) {
            this.showToast('Failed to load dashboard data', 'error');
        }
    }

    updateDashboard(data) {
        const { system, analytics, recentLogs } = data;

        // Update system status
        const statusEl = document.getElementById('system-status');
        const overallHealthy = system.services.every(s => s.status === 'healthy');
        statusEl.innerHTML = `
            <span class="status-dot ${overallHealthy ? 'healthy' : 'unhealthy'}"></span>
            <span>${overallHealthy ? 'All Systems Operational' : 'Issues Detected'}</span>
        `;

        // Update metrics
        document.getElementById('cpu-usage').textContent = `${Math.round(system.metrics.cpu.usage)}%`;
        document.getElementById('memory-usage').textContent = `${Math.round(system.metrics.memory.percentage)}%`;
        document.getElementById('uptime').textContent = this.formatUptime(system.metrics.uptime);

        // Update analytics
        document.getElementById('total-requests').textContent = analytics.totalRequests.toLocaleString();
        document.getElementById('requests-per-hour').textContent = analytics.requestsPerHour.toLocaleString();
        document.getElementById('error-rate').textContent = `${analytics.errorRate.toFixed(1)}%`;

        // Update recent logs
        this.renderLogs(recentLogs, 'recent-logs');
    }

    async loadEnvironmentVariables() {
        try {
            const response = await this.apiCall('/admin/environment');
            if (response.success) {
                this.renderEnvironmentVariables(response.data);
            }
        } catch (error) {
            this.showToast('Failed to load environment variables', 'error');
        }
    }

    renderEnvironmentVariables(envVars) {
        const container = document.getElementById('env-variables');
        
        container.innerHTML = envVars.map(env => `
            <div class="env-item" data-category="${env.category}">
                <div class="env-key">${env.key}</div>
                <div class="env-value">
                    <input type="${env.isSecret ? 'password' : 'text'}" 
                           value="${env.value}" 
                           data-key="${env.key}"
                           ${env.isSecret ? 'placeholder="Hidden for security"' : ''}>
                </div>
                <div class="env-category">${env.category}</div>
                <div class="env-secret">
                    ${env.isSecret ? '<i class="fas fa-lock"></i>' : ''}
                </div>
            </div>
        `).join('');
    }

    filterEnvironmentVariables(category) {
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');

        // Filter items
        document.querySelectorAll('.env-item').forEach(item => {
            if (category === 'all' || item.dataset.category === category) {
                item.style.display = 'grid';
            } else {
                item.style.display = 'none';
            }
        });
    }

    async saveEnvironmentVariables() {
        const inputs = document.querySelectorAll('.env-value input');
        const variables = Array.from(inputs).map(input => ({
            key: input.dataset.key,
            value: input.value
        })).filter(v => v.value.trim() !== '');

        try {
            this.showLoading(true);
            const response = await this.apiCall('/admin/environment', 'PUT', { variables });
            if (response.success) {
                this.showToast('Environment variables saved successfully!', 'success');
            } else {
                this.showToast('Failed to save environment variables', 'error');
            }
        } catch (error) {
            this.showToast('Failed to save environment variables', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async restartApplication() {
        if (!confirm('Are you sure you want to restart the application? This will cause a brief downtime.')) {
            return;
        }

        try {
            const response = await this.apiCall('/admin/restart', 'POST');
            if (response.success) {
                this.showToast('Application restart initiated...', 'info');
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            }
        } catch (error) {
            this.showToast('Failed to restart application', 'error');
        }
    }

    async loadAnalytics() {
        try {
            const response = await this.apiCall('/admin/analytics');
            if (response.success) {
                this.renderAnalytics(response.data);
            }
        } catch (error) {
            this.showToast('Failed to load analytics', 'error');
        }
    }

    renderAnalytics(analytics) {
        // Render top endpoints
        const endpointsContainer = document.getElementById('top-endpoints');
        endpointsContainer.innerHTML = analytics.topEndpoints.map(endpoint => `
            <div class="endpoint-item">
                <span>${endpoint.endpoint}</span>
                <span class="endpoint-count">${endpoint.count}</span>
            </div>
        `).join('') || '<p>No endpoint data available</p>';

        // Render recent errors
        const errorsContainer = document.getElementById('recent-errors');
        errorsContainer.innerHTML = analytics.recentErrors.map(error => `
            <div class="error-item">
                <span>${error.endpoint}</span>
                <span class="error-time">${new Date(error.timestamp).toLocaleTimeString()}</span>
            </div>
        `).join('') || '<p>No recent errors</p>';

        // Create usage chart
        this.createUsageChart(analytics);
    }

    createUsageChart(analytics) {
        const ctx = document.getElementById('usageChart').getContext('2d');
        
        if (this.charts.usage) {
            this.charts.usage.destroy();
        }

        this.charts.usage = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['1h ago', '45m ago', '30m ago', '15m ago', 'Now'],
                datasets: [{
                    label: 'Requests',
                    data: [
                        Math.max(0, analytics.requestsPerHour - 20),
                        Math.max(0, analytics.requestsPerHour - 10),
                        analytics.requestsPerHour,
                        analytics.requestsPerHour + 5,
                        analytics.requestsPerHour + 10
                    ],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    async loadServiceStatus() {
        try {
            const response = await this.apiCall('/admin/system/services');
            if (response.success) {
                this.renderServiceStatus(response.data);
            }
        } catch (error) {
            this.showToast('Failed to load service status', 'error');
        }
    }

    renderServiceStatus(services) {
        const container = document.getElementById('services-grid');
        
        container.innerHTML = services.map(service => `
            <div class="service-card ${service.status}">
                <div class="service-header">
                    <div class="service-name">${service.name}</div>
                    <div class="status-indicator">
                        <span class="status-dot ${service.status}"></span>
                        <span>${service.status}</span>
                    </div>
                </div>
                <div class="service-details">
                    <div class="service-detail">
                        <span class="service-detail-label">Last Checked:</span>
                        <span>${new Date(service.lastChecked).toLocaleTimeString()}</span>
                    </div>
                    ${service.responseTime ? `
                        <div class="service-detail">
                            <span class="service-detail-label">Response Time:</span>
                            <span>${service.responseTime}ms</span>
                        </div>
                    ` : ''}
                    ${service.error ? `
                        <div class="service-detail">
                            <span class="service-detail-label">Error:</span>
                            <span>${service.error}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    async loadLogs() {
        try {
            const response = await this.apiCall('/admin/logs?limit=200');
            if (response.success) {
                this.renderLogs(response.data, 'logs-container');
            }
        } catch (error) {
            this.showToast('Failed to load logs', 'error');
        }
    }

    renderLogs(logs, containerId) {
        const container = document.getElementById(containerId);
        
        container.innerHTML = logs.map(log => `
            <div class="log-entry" data-level="${log.level}">
                <span class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</span>
                <span class="log-level ${log.level}">${log.level.toUpperCase()}</span>
                <span class="log-message">${log.message}</span>
            </div>
        `).join('') || '<p>No logs available</p>';

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    filterLogs(level) {
        const logEntries = document.querySelectorAll('#logs-container .log-entry');
        
        logEntries.forEach(entry => {
            if (level === 'all' || entry.dataset.level === level) {
                entry.style.display = 'flex';
            } else {
                entry.style.display = 'none';
            }
        });
    }

    async loadUsers(page = 1) {
        try {
            const roleFilter = document.getElementById('user-role-filter')?.value || '';
            const statusFilter = document.getElementById('user-status-filter')?.value || '';
            const search = document.getElementById('user-search')?.value || '';
            
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20'
            });
            
            if (roleFilter) params.append('role', roleFilter);
            if (statusFilter) params.append('status', statusFilter);
            if (search) params.append('search', search);
            
            const [usersResponse, statsResponse] = await Promise.all([
                this.apiCall(`/admin/users?${params.toString()}`),
                this.apiCall('/admin/users/stats')
            ]);
            
            if (usersResponse.success && statsResponse.success) {
                this.renderUsers(usersResponse.data, statsResponse.data);
            }
        } catch (error) {
            this.showToast('Failed to load users', 'error');
        }
    }

    renderUsers(usersData, statsData) {
        // Update statistics
        document.getElementById('total-users-count').textContent = statsData.totalUsers.toLocaleString();
        document.getElementById('active-users-count').textContent = statsData.activeUsers.toLocaleString();
        document.getElementById('new-users-today').textContent = statsData.recentRegistrations.toLocaleString();
        
        // Render users table
        const container = document.getElementById('users-table');
        
        if (usersData.users.length === 0) {
            container.innerHTML = '<p>No users found</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Last Login</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${usersData.users.map(user => `
                        <tr>
                            <td>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
                                    <span>${user.name}</span>
                                </div>
                            </td>
                            <td>${user.email}</td>
                            <td><span class="role-badge ${user.role}">${user.role}</span></td>
                            <td><span class="status-badge ${user.status}">${user.status}</span></td>
                            <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
                            <td>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button class="action-btn view" onclick="adminDashboard.viewUserAnalytics('${user._id}')">View</button>
                                    ${user.status === 'verified' ? 
                                        `<button class="action-btn suspend" onclick="adminDashboard.updateUserStatus('${user._id}', 'suspended')">Suspend</button>` :
                                        `<button class="action-btn activate" onclick="adminDashboard.updateUserStatus('${user._id}', 'verified')">Activate</button>`
                                    }
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        // Render pagination
        this.renderPagination(usersData, 'users-pagination', (page) => this.loadUsers(page));
    }

    async updateUserStatus(userId, status) {
        try {
            const response = await this.apiCall(`/admin/users/${userId}/status`, 'PUT', { status });
            if (response.success) {
                this.showToast('User status updated successfully', 'success');
                this.loadUsers(); // Reload users
            } else {
                this.showToast('Failed to update user status', 'error');
            }
        } catch (error) {
            this.showToast('Failed to update user status', 'error');
        }
    }

    renderPagination(data, containerId, onPageClick) {
        const container = document.getElementById(containerId);
        const { page, totalPages, total } = data;
        
        let paginationHTML = `
            <div class="pagination-info">
                Showing ${((page - 1) * 20) + 1}-${Math.min(page * 20, total)} of ${total} items
            </div>
            <div class="pagination">
        `;
        
        // Previous button
        paginationHTML += `
            <button class="pagination-btn" ${page <= 1 ? 'disabled' : ''} 
                    onclick="${page > 1 ? `(${onPageClick.toString()})(${page - 1})` : ''}">
                Previous
            </button>
        `;
        
        // Page numbers
        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(totalPages, page + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === page ? 'active' : ''}" 
                        onclick="(${onPageClick.toString()})(${i})">
                    ${i}
                </button>
            `;
        }
        
        // Next button
        paginationHTML += `
            <button class="pagination-btn" ${page >= totalPages ? 'disabled' : ''} 
                    onclick="${page < totalPages ? `(${onPageClick.toString()})(${page + 1})` : ''}">
                Next
            </button>
        `;
        
        paginationHTML += '</div>';
        container.innerHTML = paginationHTML;
    }

    async loadAIUsage() {
        try {
            const response = await this.apiCall('/admin/ai/usage');
            if (response.success) {
                this.renderAIUsage(response.data);
            }
        } catch (error) {
            this.showToast('Failed to load AI usage data', 'error');
        }
    }

    renderAIUsage(data) {
        // OpenAI metrics
        document.getElementById('openai-tokens').textContent = data.openai.totalTokens.toLocaleString();
        document.getElementById('openai-cost').textContent = `$${data.openai.totalCost.toFixed(2)}`;
        document.getElementById('openai-requests-today').textContent = data.openai.requestsToday.toLocaleString();
        
        // Hume AI metrics
        document.getElementById('hume-calls').textContent = data.hume.totalCalls.toLocaleString();
        document.getElementById('hume-events').textContent = data.hume.eventsProcessed.toLocaleString();
        document.getElementById('hume-calls-today').textContent = data.hume.callsToday.toLocaleString();
        
        // Pinecone metrics
        document.getElementById('pinecone-queries').textContent = data.pinecone.totalQueries.toLocaleString();
        document.getElementById('pinecone-latency').textContent = `${data.pinecone.averageLatency.toFixed(1)}ms`;
        document.getElementById('pinecone-queries-today').textContent = data.pinecone.queriesToday.toLocaleString();
    }

    async loadDatabaseStats() {
        try {
            const response = await this.apiCall('/admin/database/stats');
            if (response.success) {
                this.renderDatabaseStats(response.data);
            }
        } catch (error) {
            this.showToast('Failed to load database statistics', 'error');
        }
    }

    renderDatabaseStats(data) {
        // Overview metrics
        document.getElementById('total-documents').textContent = data.totalDocuments.toLocaleString();
        document.getElementById('database-size').textContent = this.formatBytes(data.totalSize);
        document.getElementById('collections-count').textContent = data.collections.length.toString();
        
        // Collections table
        const container = document.getElementById('collections-table');
        
        container.innerHTML = `
            <div class="collection-item" style="font-weight: 600; background: var(--bg-secondary);">
                <div class="collection-name">Collection</div>
                <div class="collection-stat">Documents</div>
                <div class="collection-stat">Avg Size</div>
                <div class="collection-stat">Total Size</div>
                <div class="collection-stat">Indexes</div>
            </div>
            ${data.collections.map(collection => `
                <div class="collection-item">
                    <div class="collection-name">${collection.name}</div>
                    <div class="collection-stat">
                        <span class="collection-stat-value">${collection.documentCount.toLocaleString()}</span>
                    </div>
                    <div class="collection-stat">
                        <span class="collection-stat-value">${this.formatBytes(collection.avgSize)}</span>
                    </div>
                    <div class="collection-stat">
                        <span class="collection-stat-value">${this.formatBytes(collection.totalSize)}</span>
                    </div>
                    <div class="collection-stat">
                        <span class="collection-stat-value">${collection.indexes}</span>
                    </div>
                </div>
            `).join('')}
        `;
    }

    async loadPerformanceMetrics() {
        try {
            const response = await this.apiCall('/admin/performance/metrics');
            if (response.success) {
                this.renderPerformanceMetrics(response.data);
            }
        } catch (error) {
            this.showToast('Failed to load performance metrics', 'error');
        }
    }

    renderPerformanceMetrics(data) {
        // Render endpoint performance
        const container = document.getElementById('performance-endpoints');
        
        container.innerHTML = data.endpoints.map(endpoint => `
            <div class="performance-endpoint">
                <div class="endpoint-path">${endpoint.path}</div>
                <div class="endpoint-stats">
                    <div class="endpoint-stat">
                        <span class="endpoint-stat-value">${endpoint.requestCount}</span>
                        <span class="endpoint-stat-label">Requests</span>
                    </div>
                    <div class="endpoint-stat">
                        <span class="endpoint-stat-value">${endpoint.averageResponseTime.toFixed(1)}ms</span>
                        <span class="endpoint-stat-label">Avg Time</span>
                    </div>
                    <div class="endpoint-stat">
                        <span class="endpoint-stat-value">${endpoint.errorRate.toFixed(1)}%</span>
                        <span class="endpoint-stat-label">Error Rate</span>
                    </div>
                </div>
            </div>
        `).join('') || '<p>No performance data available</p>';

        // Create performance chart
        this.createPerformanceChart(data.endpoints);
    }

    createPerformanceChart(endpoints) {
        const ctx = document.getElementById('performanceChart')?.getContext('2d');
        if (!ctx) return;
        
        if (this.charts.performance) {
            this.charts.performance.destroy();
        }

        const topEndpoints = endpoints.slice(0, 10);
        
        this.charts.performance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topEndpoints.map(e => e.path.replace('/api/', '')),
                datasets: [{
                    label: 'Average Response Time (ms)',
                    data: topEndpoints.map(e => e.averageResponseTime),
                    backgroundColor: 'rgba(102, 126, 234, 0.7)',
                    borderColor: '#667eea',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Response Time (ms)'
                        }
                    }
                }
            }
        });
    }

    async loadSecurityEvents() {
        try {
            const response = await this.apiCall('/admin/security/events?limit=50');
            if (response.success) {
                this.renderSecurityEvents(response.data);
            }
        } catch (error) {
            this.showToast('Failed to load security events', 'error');
        }
    }

    renderSecurityEvents(events) {
        const container = document.getElementById('security-events');
        
        container.innerHTML = events.map(event => `
            <div class="security-event ${event.type}">
                <div class="security-event-header">
                    <span class="security-event-type">${event.type.replace('_', ' ')}</span>
                    <span class="security-event-time">${new Date(event.timestamp).toLocaleString()}</span>
                </div>
                <div class="security-event-details">
                    <strong>Email:</strong> ${event.email}<br>
                    <strong>Details:</strong> ${event.details}
                    ${event.ipAddress ? `<br><strong>IP:</strong> ${event.ipAddress}` : ''}
                </div>
            </div>
        `).join('') || '<p>No security events recorded</p>';
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async viewUserAnalytics(userId) {
        try {
            this.showLoading(true);
            const response = await this.apiCall(`/admin/users/${userId}/analytics`);
            
            if (response.success) {
                this.showUserAnalyticsModal(response.data);
            } else {
                this.showToast('Failed to load user analytics', 'error');
            }
        } catch (error) {
            this.showToast('Failed to load user analytics', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    showUserAnalyticsModal(analytics) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content user-analytics-modal">
                <div class="modal-header">
                    <h2><i class="fas fa-user-chart"></i> User Analytics - ${analytics.user.name}</h2>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <!-- User Overview -->
                    <div class="analytics-section">
                        <h3><i class="fas fa-user"></i> User Overview</h3>
                        <div class="user-overview-grid">
                            <div class="overview-card">
                                <div class="overview-icon">
                                    <i class="fas fa-envelope"></i>
                                </div>
                                <div class="overview-details">
                                    <span class="overview-label">Email</span>
                                    <span class="overview-value">${analytics.user.email}</span>
                                </div>
                            </div>
                            <div class="overview-card">
                                <div class="overview-icon">
                                    <i class="fas fa-shield-alt"></i>
                                </div>
                                <div class="overview-details">
                                    <span class="overview-label">Role</span>
                                    <span class="overview-value role-badge ${analytics.user.role}">${analytics.user.role}</span>
                                </div>
                            </div>
                            <div class="overview-card">
                                <div class="overview-icon">
                                    <i class="fas fa-calendar"></i>
                                </div>
                                <div class="overview-details">
                                    <span class="overview-label">Joined</span>
                                    <span class="overview-value">${new Date(analytics.user.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div class="overview-card">
                                <div class="overview-icon">
                                    <i class="fas fa-clock"></i>
                                </div>
                                <div class="overview-details">
                                    <span class="overview-label">Last Login</span>
                                    <span class="overview-value">${analytics.user.lastLogin ? new Date(analytics.user.lastLogin).toLocaleString() : 'Never'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Chat Activity -->
                    <div class="analytics-section">
                        <h3><i class="fas fa-comments"></i> Chat Activity</h3>
                        <div class="metrics-grid">
                            <div class="metric-card">
                                <div class="metric-icon chat">
                                    <i class="fas fa-comment-dots"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.chatActivity.totalSessions}</span>
                                    <span class="metric-label">Total Sessions</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon active">
                                    <i class="fas fa-play-circle"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.chatActivity.activeSessions}</span>
                                    <span class="metric-label">Active Sessions</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon time">
                                    <i class="fas fa-stopwatch"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${this.formatDuration(analytics.chatActivity.averageSessionDuration)}</span>
                                    <span class="metric-label">Avg Duration</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon messages">
                                    <i class="fas fa-envelope"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.chatActivity.totalMessages}</span>
                                    <span class="metric-label">Total Messages</span>
                                </div>
                            </div>
                        </div>
                        <div class="chart-section">
                            <h4>Sessions by Month</h4>
                            <canvas id="userSessionsChart" class="user-chart"></canvas>
                        </div>
                    </div>

                    <!-- AI Usage -->
                    <div class="analytics-section">
                        <h3><i class="fas fa-robot"></i> AI Usage</h3>
                        <div class="metrics-grid">
                            <div class="metric-card">
                                <div class="metric-icon openai">
                                    <i class="fas fa-brain"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.aiUsage.openaiRequests}</span>
                                    <span class="metric-label">OpenAI Requests</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon tokens">
                                    <i class="fas fa-coins"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.aiUsage.openaiTokens.toLocaleString()}</span>
                                    <span class="metric-label">Tokens Used</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon cost">
                                    <i class="fas fa-dollar-sign"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">$${analytics.aiUsage.openaiCost.toFixed(4)}</span>
                                    <span class="metric-label">Est. Cost</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon hume">
                                    <i class="fas fa-heart"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.aiUsage.humeApiCalls}</span>
                                    <span class="metric-label">Hume Calls</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Vector Activity -->
                    <div class="analytics-section">
                        <h3><i class="fas fa-search"></i> Vector Activity</h3>
                        <div class="metrics-grid">
                            <div class="metric-card">
                                <div class="metric-icon search">
                                    <i class="fas fa-search"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.vectorActivity.searchQueries}</span>
                                    <span class="metric-label">Search Queries</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon embeddings">
                                    <i class="fas fa-vector-square"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.vectorActivity.embeddingsGenerated}</span>
                                    <span class="metric-label">Embeddings</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon latency">
                                    <i class="fas fa-tachometer-alt"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.vectorActivity.averageSearchLatency.toFixed(1)}ms</span>
                                    <span class="metric-label">Avg Latency</span>
                                </div>
                            </div>
                        </div>
                        ${analytics.vectorActivity.topSearchTerms.length > 0 ? `
                            <div class="top-searches">
                                <h4>Top Search Terms</h4>
                                <div class="search-terms">
                                    ${analytics.vectorActivity.topSearchTerms.map(term => `
                                        <div class="search-term">
                                            <span class="term">${term.term}</span>
                                            <span class="count">${term.count}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Summaries -->
                    <div class="analytics-section">
                        <h3><i class="fas fa-file-alt"></i> Summaries</h3>
                        <div class="metrics-grid">
                            <div class="metric-card">
                                <div class="metric-icon summaries">
                                    <i class="fas fa-file-alt"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.summaries.totalSummaries}</span>
                                    <span class="metric-label">Total Summaries</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon length">
                                    <i class="fas fa-text-width"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.summaries.averageSummaryLength}</span>
                                    <span class="metric-label">Avg Length</span>
                                </div>
                            </div>
                        </div>
                        ${analytics.summaries.recentSummaries.length > 0 ? `
                            <div class="recent-summaries">
                                <h4>Recent Summaries</h4>
                                <div class="summaries-list">
                                    ${analytics.summaries.recentSummaries.slice(0, 5).map(summary => `
                                        <div class="summary-item">
                                            <div class="summary-header">
                                                <span class="summary-chat">${summary.chat_id}</span>
                                                <span class="summary-date">${new Date(summary.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <div class="summary-text">${summary.summary.substring(0, 200)}${summary.summary.length > 200 ? '...' : ''}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Enhanced Pinecone Analytics -->
                    <div class="analytics-section">
                        <h3><i class="fas fa-database"></i> Pinecone Vector Database</h3>
                        <div class="metrics-grid">
                            <div class="metric-card">
                                <div class="metric-icon pinecone">
                                    <i class="fas fa-search"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.pineconeActivity.totalQueries}</span>
                                    <span class="metric-label">Total Queries</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon upserts">
                                    <i class="fas fa-upload"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.pineconeActivity.totalUpserts}</span>
                                    <span class="metric-label">Upserts</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon dimensions">
                                    <i class="fas fa-cube"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.pineconeActivity.vectorDimensions}</span>
                                    <span class="metric-label">Dimensions</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon cost">
                                    <i class="fas fa-dollar-sign"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">$${analytics.pineconeActivity.costAnalysis.totalCost.toFixed(4)}</span>
                                    <span class="metric-label">Total Cost</span>
                                </div>
                            </div>
                        </div>
                        <div class="pinecone-details">
                            <h4>Index Statistics</h4>
                            <div class="index-stats">
                                <div class="stat-item">
                                    <span class="stat-label">Index Name:</span>
                                    <span class="stat-value">${analytics.pineconeActivity.indexStats.name}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Total Vectors:</span>
                                    <span class="stat-value">${analytics.pineconeActivity.indexStats.totalVectorCount.toLocaleString()}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Index Size:</span>
                                    <span class="stat-value">${this.formatBytes(analytics.pineconeActivity.indexStats.indexSize)}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Avg Query Time:</span>
                                    <span class="stat-value">${analytics.pineconeActivity.averageQueryTime.toFixed(2)}ms</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Enhanced Database Analytics -->
                    <div class="analytics-section">
                        <h3><i class="fas fa-server"></i> MongoDB Database</h3>
                        <div class="metrics-grid">
                            <div class="metric-card">
                                <div class="metric-icon queries">
                                    <i class="fas fa-search"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.databaseActivity.totalQueries}</span>
                                    <span class="metric-label">Total Queries</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon writes">
                                    <i class="fas fa-edit"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.databaseActivity.totalWrites}</span>
                                    <span class="metric-label">Writes</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon reads">
                                    <i class="fas fa-eye"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.databaseActivity.totalReads}</span>
                                    <span class="metric-label">Reads</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon performance">
                                    <i class="fas fa-tachometer-alt"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.databaseActivity.averageQueryTime.toFixed(1)}ms</span>
                                    <span class="metric-label">Avg Query Time</span>
                                </div>
                            </div>
                        </div>
                        ${analytics.databaseActivity.collectionUsage.length > 0 ? `
                            <div class="collection-usage">
                                <h4>Collection Usage</h4>
                                <div class="collection-list">
                                    ${analytics.databaseActivity.collectionUsage.slice(0, 5).map(collection => `
                                        <div class="collection-item">
                                            <div class="collection-name">${collection.collection}</div>
                                            <div class="collection-stats">
                                                <span class="read-count">R: ${collection.readCount}</span>
                                                <span class="write-count">W: ${collection.writeCount}</span>
                                                <span class="response-time">${collection.averageResponseTime.toFixed(1)}ms</span>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- User Behavior Tracking -->
                    <div class="analytics-section">
                        <h3><i class="fas fa-user-friends"></i> Behavior Analytics</h3>
                        <div class="metrics-grid">
                            <div class="metric-card">
                                <div class="metric-icon sessions">
                                    <i class="fas fa-clock"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.behaviorTracking.totalSessions}</span>
                                    <span class="metric-label">Sessions</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon active-time">
                                    <i class="fas fa-stopwatch"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${this.formatDuration(analytics.behaviorTracking.totalActiveTime)}</span>
                                    <span class="metric-label">Active Time</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon frequency">
                                    <i class="fas fa-calendar-day"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.behaviorTracking.sessionFrequency.toFixed(1)}</span>
                                    <span class="metric-label">Sessions/Day</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon retention">
                                    <i class="fas fa-heart"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.behaviorTracking.retentionRate.toFixed(1)}%</span>
                                    <span class="metric-label">Retention</span>
                                </div>
                            </div>
                        </div>
                        ${analytics.behaviorTracking.featureAdoption.length > 0 ? `
                            <div class="feature-adoption">
                                <h4>Feature Adoption</h4>
                                <div class="features-list">
                                    ${analytics.behaviorTracking.featureAdoption.slice(0, 6).map(feature => `
                                        <div class="feature-item">
                                            <div class="feature-name">${feature.feature}</div>
                                            <div class="feature-stats">
                                                <span class="usage-count">${feature.usageCount} uses</span>
                                                <span class="proficiency">${feature.proficiency.toFixed(0)}% proficiency</span>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Productivity Metrics -->
                    <div class="analytics-section">
                        <h3><i class="fas fa-chart-bar"></i> Productivity & Performance</h3>
                        <div class="metrics-grid">
                            <div class="metric-card">
                                <div class="metric-icon tasks">
                                    <i class="fas fa-tasks"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.productivity.tasksCompleted}</span>
                                    <span class="metric-label">Tasks Completed</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon efficiency">
                                    <i class="fas fa-award"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.productivity.efficiency}%</span>
                                    <span class="metric-label">Efficiency</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon task-time">
                                    <i class="fas fa-hourglass-half"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.productivity.averageTaskTime}s</span>
                                    <span class="metric-label">Avg Task Time</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon error-rate">
                                    <i class="fas fa-exclamation-circle"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.productivity.errorRate.toFixed(1)}%</span>
                                    <span class="metric-label">Error Rate</span>
                                </div>
                            </div>
                        </div>
                        ${analytics.productivity.bottlenecks.length > 0 ? `
                            <div class="bottlenecks">
                                <h4>Performance Bottlenecks</h4>
                                <div class="bottlenecks-list">
                                    ${analytics.productivity.bottlenecks.slice(0, 3).map(bottleneck => `
                                        <div class="bottleneck-item">
                                            <div class="bottleneck-name">${bottleneck.area}</div>
                                            <div class="bottleneck-stats">
                                                <span class="impact">Impact: ${bottleneck.impact.toFixed(1)}%</span>
                                                <span class="frequency">${bottleneck.frequency} occurrences</span>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Engagement -->
                    <div class="analytics-section">
                        <h3><i class="fas fa-chart-line"></i> Engagement</h3>
                        <div class="metrics-grid">
                            <div class="metric-card">
                                <div class="metric-icon api">
                                    <i class="fas fa-plug"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.engagement.totalApiCalls}</span>
                                    <span class="metric-label">Total API Calls</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon response">
                                    <i class="fas fa-clock"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.engagement.averageResponseTime.toFixed(1)}ms</span>
                                    <span class="metric-label">Avg Response</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon error">
                                    <i class="fas fa-exclamation-triangle"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.engagement.errorRate.toFixed(1)}%</span>
                                    <span class="metric-label">Error Rate</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon peak">
                                    <i class="fas fa-chart-bar"></i>
                                </div>
                                <div class="metric-details">
                                    <span class="metric-value">${analytics.engagement.peakUsageHour}:00</span>
                                    <span class="metric-label">Peak Hour</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Timeline -->
                    <div class="analytics-section">
                        <h3><i class="fas fa-history"></i> Activity Timeline</h3>
                        <div class="timeline">
                            ${analytics.timeline.slice(0, 10).map(activity => `
                                <div class="timeline-item ${activity.type}">
                                    <div class="timeline-icon">
                                        <i class="fas fa-${this.getTimelineIcon(activity.type)}"></i>
                                    </div>
                                    <div class="timeline-content">
                                        <div class="timeline-description">${activity.description}</div>
                                        <div class="timeline-time">${new Date(activity.timestamp).toLocaleString()}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Create chart after modal is added to DOM
        setTimeout(() => {
            this.createUserSessionsChart(analytics.chatActivity.sessionsByMonth);
        }, 100);

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    createUserSessionsChart(sessionsByMonth) {
        const ctx = document.getElementById('userSessionsChart')?.getContext('2d');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: sessionsByMonth.map(s => s.month),
                datasets: [{
                    label: 'Sessions',
                    data: sessionsByMonth.map(s => s.count),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    getTimelineIcon(type) {
        const icons = {
            chat: 'comment',
            search: 'search',
            summary: 'file-alt',
            login: 'sign-in-alt',
            error: 'exclamation-triangle'
        };
        return icons[type] || 'circle';
    }

    formatDuration(seconds) {
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}"></i>
            <span>${message}</span>
        `;

        document.getElementById('toast-container').appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    }

    // ==================== USER ACTIVITY TRACKING ====================

    /**
     * Initialize comprehensive user activity tracking
     */
    initializeTracking() {
        // Note: Tracking will be enabled after successful login
        console.log('🔍 User activity tracking initialized');
    }

    /**
     * Start user tracking session after login
     */
    async startTrackingSession(email) {
        this.userEmail = email;
        
        const deviceInfo = {
            userAgent: navigator.userAgent,
            screenResolution: `${screen.width}x${screen.height}`,
            browserInfo: this.getBrowserInfo(),
            timestamp: new Date().toISOString()
        };

        try {
            const response = await this.apiCall('/admin/tracking/session/start', 'POST', {
                email,
                deviceInfo
            });

            if (response.success) {
                this.sessionId = response.data.sessionId;
                this.isTracking = true;
                console.log('✅ Tracking session started:', this.sessionId);
                this.setupInteractionTracking();
            }
        } catch (error) {
            console.error('Failed to start tracking session:', error);
        }
    }

    /**
     * Setup interaction tracking after session starts
     */
    setupInteractionTracking() {
        if (!this.isTracking) return;

        // Track all clicks
        document.addEventListener('click', (e) => {
            const element = this.getElementSelector(e.target);
            this.trackInteraction('click', element, this.currentPage, {
                coordinates: { x: e.clientX, y: e.clientY }
            });
        }, { passive: true });

        // Track section navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                const section = link.dataset.section;
                this.trackFeatureUsage('navigation', 'section_change', { section });
            });
        });

        console.log('🎯 Interaction tracking enabled');
    }

    /**
     * Track user interaction
     */
    async trackInteraction(type, element, page, metadata = {}) {
        if (!this.isTracking || !this.sessionId) return;

        try {
            await this.apiCall('/admin/tracking/interaction', 'POST', {
                sessionId: this.sessionId,
                type,
                element,
                page: this.currentSection || 'dashboard',
                metadata
            });
        } catch (error) {
            console.error('Failed to track interaction:', error);
        }
    }

    /**
     * Track feature usage
     */
    async trackFeatureUsage(feature, action, metadata = {}, success = true) {
        if (!this.isTracking || !this.sessionId || !this.userEmail) return;

        try {
            await this.apiCall('/admin/tracking/feature-usage', 'POST', {
                email: this.userEmail,
                sessionId: this.sessionId,
                feature,
                action,
                startTime: new Date().toISOString(),
                metadata,
                success
            });
        } catch (error) {
            console.error('Failed to track feature usage:', error);
        }
    }

    /**
     * Get CSS selector for an element
     */
    getElementSelector(element) {
        if (!element) return 'unknown';
        
        if (element.id) return `#${element.id}`;
        
        if (element.className && typeof element.className === 'string') {
            const classes = element.className.split(' ').filter(c => c.length > 0);
            if (classes.length > 0) return `.${classes.join('.')}`;
        }
        
        return element.tagName.toLowerCase();
    }

    /**
     * Get browser information
     */
    getBrowserInfo() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Unknown';
    }


}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});