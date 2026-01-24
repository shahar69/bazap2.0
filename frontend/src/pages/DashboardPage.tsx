import React, { useState, useEffect } from 'react';
import { eventApi } from '../services/apiClient';
import '../styles/dashboard.css';

interface EventDto {
  id: number;
  eventNumber: string;
  eventType: number;
  sourceUnit: string;
  receiver: string;
  status: number;
  createdDate: string;
  items?: EventItemDto[];
}

interface EventItemDto {
  id: number;
  makat: string;
  name: string;
  quantity: number;
  inspectionAction: number;
}

interface DashboardStats {
  totalEvents: number;
  activeEvents: number;
  completedEvents: number;
  totalItemsInspected: number;
  totalDisabled: number;
  totalPassed: number;
  todayEvents: number;
  todayInspections: number;
}

interface RecentActivity {
  eventNumber: string;
  eventType: string;
  createdDate: string;
  itemsCount: number;
  status: string;
}

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    activeEvents: 0,
    completedEvents: 0,
    totalItemsInspected: 0,
    totalDisabled: 0,
    totalPassed: 0,
    todayEvents: 0,
    todayInspections: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadDashboardData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const refreshTimer = setInterval(() => loadDashboardData(), 30000); // Refresh every 30 seconds
    
    return () => {
      clearInterval(timer);
      clearInterval(refreshTimer);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      const events: EventDto[] = await eventApi.getAllEvents();
      
      // Calculate stats
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      let totalItems = 0;
      let totalDisabled = 0;
      let totalPassed = 0;
      let todayEvents = 0;
      let todayInspections = 0;
      
      events.forEach((event: EventDto) => {
        const eventDate = new Date(event.createdDate);
        
        totalItems += event.items?.length || 0;
        
        event.items?.forEach((item: EventItemDto) => {
          if (item.inspectionAction === 1) totalPassed++;
          if (item.inspectionAction === 2) totalDisabled++;
          
          if (eventDate >= todayStart) todayInspections++;
        });
        
        if (eventDate >= todayStart) todayEvents++;
      });
      
      setStats({
        totalEvents: events.length,
        activeEvents: events.filter((e: EventDto) => e.status === 0).length,
        completedEvents: events.filter((e: EventDto) => e.status === 1).length,
        totalItemsInspected: totalItems,
        totalDisabled,
        totalPassed,
        todayEvents,
        todayInspections,
      });
      
      // Recent activity
      const recent = events
        .sort((a: EventDto, b: EventDto) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())
        .slice(0, 10)
        .map((e: EventDto) => ({
          eventNumber: e.eventNumber,
          eventType: getEventTypeName(e.eventType),
          createdDate: new Date(e.createdDate).toLocaleString('he-IL'),
          itemsCount: e.items?.length || 0,
          status: e.status === 0 ? 'פעיל' : 'הושלם',
        }));
      
      setRecentActivity(recent);
      setLoading(false);
    } catch (error) {
      console.error('שגיאה בטעינת נתוני דשבורד:', error);
      setLoading(false);
    }
  };

  const getEventTypeName = (type: number) => {
    const types: { [key: number]: string } = {
      0: 'קבלת ציוד',
      1: 'החזרת ציוד',
      2: 'ניפוק ציוד',
      3: 'בדיקת ציוד'
    };
    return types[type] || 'לא ידוע';
  };

  const calculatePassRate = () => {
    const total = stats.totalPassed + stats.totalDisabled;
    return total > 0 ? ((stats.totalPassed / total) * 100).toFixed(1) : '0';
  };

  if (loading) {
    return <div className="dashboard-loading">⏳ טוען נתונים...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>🎯 לוח הבקרה של המפקד</h1>
          <p className="dashboard-subtitle">מעקב ובקרה בזמן אמת</p>
        </div>
        <div className="dashboard-time">
          <div className="time-display">{currentTime.toLocaleTimeString('he-IL')}</div>
          <div className="date-display">{currentTime.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-primary">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalEvents}</div>
            <div className="stat-label">סה"כ אירועים</div>
          </div>
        </div>

        <div className="stat-card stat-success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalPassed}</div>
            <div className="stat-label">פריטים עברו</div>
          </div>
        </div>

        <div className="stat-card stat-danger">
          <div className="stat-icon">⛔</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalDisabled}</div>
            <div className="stat-label">פריטים הושבתו</div>
          </div>
        </div>

        <div className="stat-card stat-warning">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <div className="stat-value">{stats.activeEvents}</div>
            <div className="stat-label">אירועים פעילים</div>
          </div>
        </div>

        <div className="stat-card stat-info">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalItemsInspected}</div>
            <div className="stat-label">סה"כ פריטים</div>
          </div>
        </div>

        <div className="stat-card stat-completed">
          <div className="stat-icon">🏁</div>
          <div className="stat-content">
            <div className="stat-value">{stats.completedEvents}</div>
            <div className="stat-label">אירועים הושלמו</div>
          </div>
        </div>

        <div className="stat-card stat-today">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.todayEvents}</div>
            <div className="stat-label">אירועים היום</div>
          </div>
        </div>

        <div className="stat-card stat-percent">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-value">{calculatePassRate()}%</div>
            <div className="stat-label">שיעור מעבר</div>
          </div>
        </div>
      </div>

      <div className="dashboard-charts">
        <div className="chart-card">
          <h3>📈 ביצועים</h3>
          <div className="performance-bars">
            <div className="performance-item">
              <div className="performance-label">
                <span>פריטים עברו</span>
                <span className="performance-value">{stats.totalPassed}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill progress-success" 
                  style={{ width: `${(stats.totalPassed / (stats.totalItemsInspected || 1)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="performance-item">
              <div className="performance-label">
                <span>פריטים הושבתו</span>
                <span className="performance-value">{stats.totalDisabled}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill progress-danger" 
                  style={{ width: `${(stats.totalDisabled / (stats.totalItemsInspected || 1)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="performance-item">
              <div className="performance-label">
                <span>אירועים הושלמו</span>
                <span className="performance-value">{stats.completedEvents}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill progress-info" 
                  style={{ width: `${(stats.completedEvents / (stats.totalEvents || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="chart-card">
          <h3>🔥 פעילות אחרונה</h3>
          <div className="activity-list">
            {recentActivity.length === 0 ? (
              <div className="no-activity">אין פעילות אחרונה</div>
            ) : (
              recentActivity.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">
                    {activity.status === 'פעיל' ? '⚡' : '✓'}
                  </div>
                  <div className="activity-details">
                    <div className="activity-title">
                      {activity.eventType} - {activity.eventNumber}
                    </div>
                    <div className="activity-meta">
                      {activity.createdDate} • {activity.itemsCount} פריטים • {activity.status}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-footer">
        <div className="footer-stat">
          <span className="footer-icon">🕐</span>
          <span>עדכון אחרון: {currentTime.toLocaleTimeString('he-IL')}</span>
        </div>
        <div className="footer-stat">
          <span className="footer-icon">🔄</span>
          <span>רענון אוטומטי כל 30 שניות</span>
        </div>
        <div className="footer-stat">
          <span className="footer-icon">🚀</span>
          <span>BAZAP 2.0 Commander Dashboard</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
