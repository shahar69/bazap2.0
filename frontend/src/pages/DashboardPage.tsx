import React, { useState, useEffect } from 'react';
import { eventApi } from '../services/apiClient';
import '../styles/dashboard.css';

interface EventDto {
  id: number;
  eventNumber: string;
  orderNumber?: string;
  eventType: number;
  sourceUnit: string;
  receiver: string;
  status: number;
  statusLabel?: string;
  sapReady?: boolean;
  sapSyncStatus?: string;
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
  totalOrders: number;
  openOrders: number;
  completedOrders: number;
  totalItemsHandled: number;
  totalDisabled: number;
  totalPassed: number;
  readyForSap: number;
  exportedToSap: number;
  needsSapCompletion: number;
}

interface RecentActivity {
  orderNumber: string;
  eventType: string;
  createdDate: string;
  itemsCount: number;
  status: string;
}

const DashboardPage: React.FC = () => {
  const [events, setEvents] = useState<EventDto[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'all'>('7d');

  useEffect(() => {
    loadDashboardData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const refreshTimer = setInterval(() => loadDashboardData(), 15000); // Refresh every 15 seconds
    
    return () => {
      clearInterval(timer);
      clearInterval(refreshTimer);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      setError('');
      const events: EventDto[] = await eventApi.getAllEvents();
      console.log('📊 Events loaded:', events?.length || 0);
      setEvents(events || []);
      
      const recent = (events || [])
        .sort((a: EventDto, b: EventDto) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())
        .slice(0, 15)
        .map((e: EventDto) => ({
          orderNumber: e.orderNumber || e.eventNumber,
          eventType: getEventTypeName(e.eventType),
          createdDate: new Date(e.createdDate).toLocaleString('he-IL'),
          itemsCount: e.items?.length || 0,
          status: e.sapSyncStatus === 'exported'
            ? 'חבילת SAP הוכנה'
            : isCompletedStatus(e.status)
              ? 'הושלם'
              : 'פתוח לטיפול',
        }));
      
      setRecentActivity(recent);
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to load dashboard data';
      console.error('❌ Dashboard error:', errorMsg, error);
      setError(errorMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getEventTypeName = (type: number) => {
    const types: { [key: number]: string } = {
      0: 'קבלת ציוד',
      1: 'בדיקת ציוד',
      2: 'ניפוק ציוד',
    };
    return types[type] || 'לא ידוע';
  };

  const getRangeStart = (range: 'today' | '7d' | '30d' | 'all') => {
    const now = new Date();
    if (range === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (range === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (range === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return null;
  };

  const filteredEvents = React.useMemo(() => {
    const start = getRangeStart(dateRange);
    if (!start) return events;
    return events.filter((event) => new Date(event.createdDate) >= start);
  }, [events, dateRange]);

  const stats = React.useMemo<DashboardStats>(() => {
    let totalItems = 0;
    let totalDisabled = 0;
    let totalPassed = 0;
    let readyForSap = 0;
    let exportedToSap = 0;
    let needsSapCompletion = 0;

    filteredEvents.forEach((event: EventDto) => {
      totalItems += event.items?.length || 0;

      event.items?.forEach((item: EventItemDto) => {
        if (item.inspectionAction === 1) totalPassed++;
        if (item.inspectionAction === 2) totalDisabled++;
      });

      if (event.sapSyncStatus === 'exported') {
        exportedToSap++;
      } else if (event.sapReady) {
        readyForSap++;
      } else if ((event.items?.length || 0) > 0) {
        needsSapCompletion++;
      }
    });

    return {
      totalOrders: filteredEvents.length,
      openOrders: filteredEvents.filter((e: EventDto) => !isCompletedStatus(e.status)).length,
      completedOrders: filteredEvents.filter((e: EventDto) => isCompletedStatus(e.status)).length,
      totalItemsHandled: totalItems,
      totalDisabled,
      totalPassed,
      readyForSap,
      exportedToSap,
      needsSapCompletion,
    };
  }, [filteredEvents]);

  const passRate = React.useMemo(() => {
    const total = stats.totalPassed + stats.totalDisabled;
    return total > 0 ? ((stats.totalPassed / total) * 100).toFixed(1) : '0';
  }, [stats.totalPassed, stats.totalDisabled]);

  const disableRate = React.useMemo(() => {
    const total = stats.totalPassed + stats.totalDisabled;
    return total > 0 ? ((stats.totalDisabled / total) * 100).toFixed(1) : '0';
  }, [stats.totalPassed, stats.totalDisabled]);

  const averageItemsPerEvent = React.useMemo(() => {
    return stats.totalOrders > 0 ? (stats.totalItemsHandled / stats.totalOrders).toFixed(1) : '0';
  }, [stats.totalOrders, stats.totalItemsHandled]);

  const agingActiveEvents = React.useMemo(() => {
    const now = new Date().getTime();
    return filteredEvents.filter((event) => !isCompletedStatus(event.status) && (now - new Date(event.createdDate).getTime()) > 48 * 60 * 60 * 1000);
  }, [filteredEvents]);

  const topItems = React.useMemo(() => {
    const counts = new Map<string, number>();
    filteredEvents.forEach((event) => {
      event.items?.forEach((item) => {
        counts.set(item.name, (counts.get(item.name) || 0) + item.quantity);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [filteredEvents]);

  const topUnits = React.useMemo(() => {
    const counts = new Map<string, number>();
    filteredEvents.forEach((event) => {
      counts.set(event.sourceUnit, (counts.get(event.sourceUnit) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [filteredEvents]);

  // Always render the page with loading/error UI overlaid if needed
  return (
    <div className="dashboard-container">
      {loading && <div className="alert alert-warning">טוען נתוני דשבורד...</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>🎯 לוח הבקרה של המפקד</h1>
          <p className="dashboard-subtitle">מה פתוח עכשיו, מה דורש השלמות, ומה מוכן לחבילת SAP</p>
          <div className="range-tabs">
            <button className={dateRange === 'today' ? 'active' : ''} onClick={() => setDateRange('today')}>היום</button>
            <button className={dateRange === '7d' ? 'active' : ''} onClick={() => setDateRange('7d')}>7 ימים</button>
            <button className={dateRange === '30d' ? 'active' : ''} onClick={() => setDateRange('30d')}>30 ימים</button>
            <button className={dateRange === 'all' ? 'active' : ''} onClick={() => setDateRange('all')}>הכל</button>
          </div>
        </div>
        <div className="dashboard-time">
          <div className="time-display">{currentTime.toLocaleTimeString('he-IL')}</div>
          <div className="date-display">{currentTime.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <button 
          className="refresh-btn"
          onClick={() => loadDashboardData()}
          disabled={refreshing}
          title="רענן נתונים (כל 15 שניות)"
        >
          {refreshing ? '⟳' : '🔄'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-primary">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalOrders}</div>
            <div className="stat-label">סה"כ הזמנות</div>
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
            <div className="stat-value">{stats.openOrders}</div>
            <div className="stat-label">הזמנות פתוחות</div>
          </div>
        </div>

        <div className="stat-card stat-info">
          <div className="stat-icon">🏭</div>
          <div className="stat-content">
            <div className="stat-value">{stats.readyForSap}</div>
            <div className="stat-label">מוכנות לייצוא SAP</div>
          </div>
        </div>

        <div className="stat-card stat-completed">
          <div className="stat-icon">⬇️</div>
          <div className="stat-content">
            <div className="stat-value">{stats.exportedToSap}</div>
            <div className="stat-label">חבילות SAP הוכנו</div>
          </div>
        </div>

        <div className="stat-card stat-today">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">{stats.needsSapCompletion}</div>
            <div className="stat-label">דורשות השלמות</div>
          </div>
        </div>

        <div className="stat-card stat-percent">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-value">{passRate}%</div>
            <div className="stat-label">שיעור מעבר</div>
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">שיעור השבתה</div>
          <div className="kpi-value danger">{disableRate}%</div>
          <div className="kpi-meta">מתוך {stats.totalPassed + stats.totalDisabled} החלטות</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">ממוצע פריטים לאירוע</div>
          <div className="kpi-value">{averageItemsPerEvent}</div>
          <div className="kpi-meta">מחושב לטווח הנבחר</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">הזמנות פתוחות מעל 48 שעות</div>
          <div className="kpi-value warning">{agingActiveEvents.length}</div>
          <div className="kpi-meta">דורש דחיפה תפעולית</div>
        </div>
      </div>

      <div className="dashboard-charts">
        <div className="chart-card">
          <h3>📈 ביצועים כללי</h3>
          <div className="performance-bars">
            <div className="performance-item">
              <div className="performance-label">
                <span>פריטים עברו בדיקה</span>
                <span className="performance-value">{stats.totalPassed}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill progress-success" 
                  style={{ width: `${(stats.totalPassed / (stats.totalItemsHandled || 1)) * 100}%` }}
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
                  style={{ width: `${(stats.totalDisabled / (stats.totalItemsHandled || 1)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="performance-item">
              <div className="performance-label">
                <span>הזמנות הושלמו</span>
                <span className="performance-value">{stats.completedOrders}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill progress-info" 
                  style={{ width: `${(stats.completedOrders / (stats.totalOrders || 1)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="performance-item">
              <div className="performance-label">
                <span>הזמנות פתוחות</span>
                <span className="performance-value">{stats.openOrders}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill progress-warning" 
                  style={{ width: `${(stats.openOrders / (stats.totalOrders || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="chart-card">
          <h3>🚨 מה דורש התערבות</h3>
          <div className="alerts-list">
            {agingActiveEvents.length === 0 ? (
              <div className="no-activity">אין התראות חריגות</div>
            ) : (
              agingActiveEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="alert-item">
                  <div className="alert-title">{event.orderNumber || event.eventNumber} • {getEventTypeName(event.eventType)}</div>
                  <div className="alert-meta">יחידה: {event.sourceUnit} • מקבל: {event.receiver}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="chart-card">
          <h3>🔥 פעילות אחרונה ({recentActivity.length})</h3>
          <div className="activity-list">
            {recentActivity.length === 0 ? (
              <div className="no-activity">אין פעילות אחרונה</div>
            ) : (
              recentActivity.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">
                    {activity.status === 'פתוח לטיפול' ? '⚡' : activity.status === 'חבילת SAP הוכנה' ? '⬇️' : '✓'}
                  </div>
                  <div className="activity-details">
                    <div className="activity-title">
                      {activity.eventType} - {activity.orderNumber}
                    </div>
                    <div className="activity-meta">
                      {activity.createdDate} • {activity.itemsCount} פריטים • <span className={`status-${activity.status === 'פתוח לטיפול' ? 'active' : 'completed'}`}>{activity.status}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="chart-card">
          <h3>⭐ פריטים מובילים</h3>
          <div className="mini-list">
            {topItems.length === 0 ? (
              <div className="no-activity">אין נתונים</div>
            ) : (
              topItems.map(([name, qty]) => (
                <div key={name} className="mini-list-item">
                  <span>{name}</span>
                  <strong>{qty}</strong>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="chart-card">
          <h3>🏷️ יחידות פעילות</h3>
          <div className="mini-list">
            {topUnits.length === 0 ? (
              <div className="no-activity">אין נתונים</div>
            ) : (
              topUnits.map(([unit, count]) => (
                <div key={unit} className="mini-list-item">
                  <span>{unit}</span>
                  <strong>{count}</strong>
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
          <span>רענון אוטומטי כל 15 שניות</span>
        </div>
        <div className="footer-stat">
          <span className="footer-icon">📡</span>
          <span>מצב: {refreshing ? '🔄 מעדכן...' : '✓ מעודכן'}</span>
        </div>
        <div className="footer-stat">
          <span className="footer-icon">🚀</span>
          <span>BAZAP 2.0 Operational Dashboard - Stage 1 SAP Export</span>
        </div>
      </div>
    </div>
  );
};

function isCompletedStatus(status: number): boolean {
  return status === 3 || status === 4;
}

export default DashboardPage;
