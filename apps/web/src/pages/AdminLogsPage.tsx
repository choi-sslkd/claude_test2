import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:3000';

type AuditLog = {
  id: string;
  type: string;
  requestedAt: string;
  actor?: string;
  detail?: string;
  prompt?: string;
  riskLevel?: string;
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('admin_access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function AdminLogsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const adminName = localStorage.getItem('admin_name') || '관리자';
  const adminEmail = localStorage.getItem('admin_email') || 'admin@promptguard.com';

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_name');
    localStorage.removeItem('admin_email');
    navigate('/admin/login');
  };

  async function fetchLogs() {
    try {
      setLoading(true);
      setError('');

      const url = filter
        ? `${API_BASE_URL}/api/v1/audit-logs?type=${filter}&limit=50`
        : `${API_BASE_URL}/api/v1/audit-logs?limit=50`;

      const response = await fetch(url, {
        headers: authHeaders(),
      });

      if (response.status === 401) {
        setError('인증이 만료되었습니다. 다시 로그인하세요.');
        return;
      }

      if (!response.ok) throw new Error('로그 조회 실패');

      const data = await response.json();
      setLogs(data.data || []);
    } catch (err: any) {
      setError(err.message || '로그를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'rule_create': return '룰 생성';
      case 'rule_update': return '룰 수정';
      case 'rule_disable': return '룰 삭제';
      case 'analyze': return '프롬프트 분석';
      default: return type;
    }
  };

  const getTypeBadgeStyle = (type: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
    };
    switch (type) {
      case 'rule_create': return { ...base, backgroundColor: '#1a3a1a', color: '#4ade80' };
      case 'rule_update': return { ...base, backgroundColor: '#1a2a3a', color: '#60a5fa' };
      case 'rule_disable': return { ...base, backgroundColor: '#3a1a1a', color: '#f87171' };
      case 'analyze': return { ...base, backgroundColor: '#2a2a1a', color: '#facc15' };
      default: return { ...base, backgroundColor: '#2a2a2a', color: '#9ca3af' };
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('ko-KR');
    } catch { return iso; }
  };

  const styles: Record<string, React.CSSProperties> = {
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '16px' },
    th: { padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #333', color: '#9ca3af', fontSize: '13px' },
    td: { padding: '12px 16px', borderBottom: '1px solid #222', fontSize: '13px', color: '#e5e7eb' },
    filterBar: { display: 'flex', gap: '8px', marginBottom: '16px' },
    filterBtn: { padding: '6px 16px', borderRadius: '20px', border: '1px solid #444', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: '12px' },
    filterBtnActive: { padding: '6px 16px', borderRadius: '20px', border: '1px solid #6366f1', background: '#6366f1', color: 'white', cursor: 'pointer', fontSize: '12px' },
    refreshBtn: { padding: '6px 16px', borderRadius: '8px', border: '1px solid #444', background: '#1a1a2e', color: '#ccc', cursor: 'pointer', fontSize: '12px', marginLeft: 'auto' },
    empty: { textAlign: 'center', padding: '40px', color: '#666' },
    error: { padding: '12px 20px', backgroundColor: '#5c0a0a', color: '#ff6b6b', borderRadius: '8px', marginBottom: '16px' },
  };

  return (
    <div className="page dashboard-page">
      <aside className="sidebar">
        <div className="sidebar-top">
          <h2>PromptGuard</h2>
          <p>관리자 콘솔</p>
        </div>
        <nav className="sidebar-menu">
          <button className={`menu-item ${location.pathname === '/admin/dashboard' ? 'active' : ''}`} onClick={() => navigate('/admin/dashboard')}>대시보드</button>
          <button className={`menu-item ${location.pathname === '/admin/rules' ? 'active' : ''}`} onClick={() => navigate('/admin/rules')}>룰 관리</button>
          <button className={`menu-item ${location.pathname === '/admin/logs' ? 'active' : ''}`} onClick={() => navigate('/admin/logs')}>로그 보기</button>
          <button className={`menu-item ${location.pathname === '/admin/settings' ? 'active' : ''}`} onClick={() => navigate('/admin/settings')}>설정</button>
        </nav>
      </aside>

      <main className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <h1>감사 로그</h1>
            <p>룰 생성, 수정, 삭제 및 프롬프트 분석 기록을 확인합니다.</p>
          </div>
          <button className="logout-button" onClick={handleLogout}>로그아웃</button>
        </header>

        {error && <div style={styles.error}>{error}</div>}

        <section className="large-card">
          <div style={styles.filterBar}>
            <button style={filter === '' ? styles.filterBtnActive : styles.filterBtn} onClick={() => setFilter('')}>전체</button>
            <button style={filter === 'rule_create' ? styles.filterBtnActive : styles.filterBtn} onClick={() => setFilter('rule_create')}>룰 생성</button>
            <button style={filter === 'rule_update' ? styles.filterBtnActive : styles.filterBtn} onClick={() => setFilter('rule_update')}>룰 수정</button>
            <button style={filter === 'rule_disable' ? styles.filterBtnActive : styles.filterBtn} onClick={() => setFilter('rule_disable')}>룰 삭제</button>
            <button style={filter === 'analyze' ? styles.filterBtnActive : styles.filterBtn} onClick={() => setFilter('analyze')}>분석</button>
            <button style={styles.refreshBtn} onClick={fetchLogs}>{loading ? '로딩...' : '새로고침'}</button>
          </div>

          {logs.length === 0 ? (
            <div style={styles.empty}>
              {loading ? '로그를 불러오는 중...' : '로그가 없습니다. 룰을 추가하면 여기에 기록됩니다.'}
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>시간</th>
                  <th style={styles.th}>유형</th>
                  <th style={styles.th}>상세</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ ...styles.td, whiteSpace: 'nowrap', width: '180px' }}>{formatTime(log.requestedAt)}</td>
                    <td style={{ ...styles.td, width: '100px' }}>
                      <span style={getTypeBadgeStyle(log.type)}>{getTypeLabel(log.type)}</span>
                    </td>
                    <td style={styles.td}>{log.detail || log.prompt || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
