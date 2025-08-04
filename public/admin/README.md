# 🌟 Stella Admin Dashboard

A comprehensive administrative interface for managing your Stella API backend.

## 🚀 Features

### 🔧 Environment Management
- **View & Edit**: All environment variables organized by category
- **Real-time Updates**: Changes take effect immediately
- **Security**: Sensitive values are masked for protection
- **Categories**: Database, API Keys, Application, Security settings

### 📊 System Analytics
- **Real-time Metrics**: CPU usage, memory consumption, uptime
- **API Usage**: Request tracking, endpoint statistics, error rates
- **Visual Charts**: Interactive graphs powered by Chart.js
- **Performance Monitoring**: Response times and system health

### 🏥 Service Health Monitoring
- **Database Status**: MongoDB connection health
- **Vector Database**: Pinecone service status  
- **Response Times**: Real-time latency monitoring
- **Error Tracking**: Automatic error detection and logging

### 📝 System Logs
- **Real-time Logs**: Live system activity monitoring
- **Log Levels**: Filter by error, warning, info, debug
- **Search & Filter**: Find specific log entries quickly
- **Export Capabilities**: Download logs for analysis

## 🎯 Quick Start

### 1. Access the Dashboard
```
http://localhost:3000/admin/
```

### 2. Admin Login
- **Email**: Your admin user email
- **Password**: Your admin password
- **Role**: Must have ADMIN role in the system

### 3. Navigation
- **Dashboard**: System overview and metrics
- **Environment**: Manage configuration variables
- **Analytics**: View usage statistics and charts
- **Services**: Monitor database and service health
- **Logs**: Browse system logs and errors

## 🔐 Security Features

### Authentication Required
- JWT-based authentication
- Admin role verification
- Secure token storage

### Environment Protection
- Sensitive variables are masked
- Audit logging for all changes
- Secure transmission of updates

### Access Control
- Role-based permissions
- Protected API endpoints
- Session management

## 🎨 User Interface

### Modern Design
- **Responsive**: Works on desktop, tablet, and mobile
- **Clean Layout**: Organized sections with clear navigation
- **Visual Indicators**: Color-coded status and health metrics
- **Real-time Updates**: Auto-refresh every 30 seconds

### Dashboard Sections

#### 1. **System Overview**
- Overall health status
- Performance metrics (CPU, Memory, Uptime)
- Request analytics summary
- Recent activity logs

#### 2. **Environment Variables**
```
Categories:
├── Database (MongoDB settings)
├── API Keys (Pinecone, OpenAI, Hume)
├── Application (Port, Environment)
├── Security (JWT secrets)
└── Other (Custom variables)
```

#### 3. **Analytics Dashboard**
- API usage trends
- Top endpoints by traffic
- Error rate monitoring
- Performance metrics over time

#### 4. **Service Status**
- MongoDB connection status
- Pinecone vector database health
- Response time monitoring
- Service error tracking

#### 5. **System Logs**
- Real-time log streaming
- Filterable by log level
- Searchable content
- Export functionality

## 🔧 Configuration Management

### Updating Environment Variables
1. Navigate to **Environment** section
2. Select category tabs to filter variables
3. Edit values in the input fields
4. Click **Save Changes** to apply
5. Use **Restart App** if required for changes

### Safe Environment Updates
- Variables are validated before saving
- Backup recommendations before major changes
- Rollback capability through file system
- Change audit logging

## 📈 Monitoring & Analytics

### Key Metrics Tracked
- **System Resources**: CPU, Memory, Disk usage
- **API Performance**: Request counts, response times
- **Error Rates**: Failed requests, error patterns
- **Service Health**: Database connectivity, external APIs

### Real-time Dashboards
- Live updating charts and graphs
- Customizable time ranges
- Export capabilities for reporting
- Mobile-responsive design

## 🛠️ Development & Maintenance

### Adding New Features
The admin dashboard is built with:
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Express.js API endpoints
- **Charts**: Chart.js for visualizations
- **Icons**: Font Awesome
- **Styling**: Modern CSS with CSS Grid/Flexbox

### API Endpoints
```
Base: /api/admin/

GET  /environment         - Get environment variables
PUT  /environment         - Update environment variables
GET  /system/status       - Get system status
GET  /system/metrics      - Get performance metrics
GET  /system/services     - Get service health
GET  /analytics           - Get usage analytics
GET  /logs               - Get system logs
POST /restart            - Restart application
GET  /dashboard          - Get combined dashboard data
```

### Customization
- Modify `public/admin/styles.css` for styling
- Update `public/admin/app.js` for functionality
- Add new API endpoints in `src/admin/`
- Extend analytics in `adminService`

## 🔄 Maintenance Tasks

### Regular Monitoring
- Check system health daily
- Review error logs weekly
- Monitor resource usage trends
- Update environment variables as needed

### Performance Optimization
- Clean up old logs periodically
- Monitor memory usage patterns
- Optimize database connections
- Review API usage patterns

## 🚨 Troubleshooting

### Common Issues

#### Login Problems
- Verify admin user exists with ADMIN role
- Check JWT configuration
- Ensure proper authentication headers

#### Environment Updates Not Working
- Verify file permissions on .env
- Check for syntax errors in values
- Restart application after critical changes

#### Missing Data in Dashboard
- Check API endpoint connectivity
- Verify database connections
- Review browser console for errors

### Support
For technical support or feature requests, check the main project documentation or contact the development team.

---

**Built with ❤️ for Stella API Management**