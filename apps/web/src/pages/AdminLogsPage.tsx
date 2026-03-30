import { useLocation, useNavigate } from 'react-router-dom';

type AdminLogItem = {
  id: number;
  time: string;
  type: string;
  description: string;
  status: '성공' | '경고' | '정보';
};

export default function AdminLogsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const adminName = localStorage.getItem('admin_name') || '관리자';
  const adminEmail = localStorage.getItem('admin_email') || 'admin@promptguard.com';

  const handleLogout = () => {
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_name');
    localStorage.removeItem('admin_email');

    navigate('/admin/login');
  };

  const logs: AdminLogItem[] = [
    {
      id: 1,
      time: '2026-03-29 19:08:21',
      type: '룰 생성',
      description: '새 탐지 룰 "y secret override"가 HIGH 위험도로 등록되었습니다.',
      status: '성공',
    },
    {
      id: 2,
      time: '2026-03-29 18:55:10',
      type: '룰 조회',
      description: '활성 룰 목록이 /admin/rules/active API를 통해 조회되었습니다.',
      status: '정보',
    },
    {
      id: 3,
      time: '2026-03-29 18:41:03',
      type: '관리자 로그인',
      description: `${adminName} (${adminEmail}) 계정이 관리자 콘솔에 로그인했습니다.`,
      status: '성공',
    },
    {
      id: 4,
      time: '2026-03-29 18:22:47',
      type: '룰 변경',
      description: '"pretend you are" 패턴의 위험도 설정이 검토되었습니다.',
      status: '정보',
    },
    {
      id: 5,
      time: '2026-03-29 18:10:05',
      type: '운영 주의',
      description: '중복 패턴 "act as"가 활성 룰 목록에 존재합니다. 정리 여부를 확인하세요.',
      status: '경고',
    },
  ];

  const getStatusClassName = (status: AdminLogItem['status']) => {
    if (status === '성공') return 'status success';
    if (status === '경고') return 'status warning';
    return 'status info';
  };

  return (
    <div className="page dashboard-page">
      <aside className="sidebar">
        <div className="sidebar-top">
          <h2>PromptGuard</h2>
          <p>관리자 콘솔</p>
        </div>

        <nav className="sidebar-menu">
          <button
            className={`menu-item ${
              location.pathname === '/admin/dashboard' ? 'active' : ''
            }`}
            onClick={() => navigate('/admin/dashboard')}
          >
            대시보드
          </button>

          <button
            className={`menu-item ${
              location.pathname === '/admin/rules' ? 'active' : ''
            }`}
            onClick={() => navigate('/admin/rules')}
          >
            룰 관리
          </button>

          <button
            className={`menu-item ${
              location.pathname === '/admin/logs' ? 'active' : ''
            }`}
            onClick={() => navigate('/admin/logs')}
          >
            로그 보기
          </button>

          <button
            className={`menu-item ${
              location.pathname === '/admin/settings' ? 'active' : ''
            }`}
            onClick={() => navigate('/admin/settings')}
          >
            설정
          </button>
        </nav>
      </aside>

      <main className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <h1>로그 보기</h1>
            <p>관리자 활동 및 룰 운영 이력을 확인할 수 있습니다.</p>
          </div>

          <button className="logout-button" onClick={handleLogout}>
            로그아웃
          </button>
        </header>

        <section className="large-card">
          <h2>운영 로그 안내</h2>
          <p>
            이 화면은 관리자 페이지에서 발생한 주요 작업 이력을 확인하기 위한 영역입니다.
            현재는 예시 로그를 표시하고 있으며, 이후 백엔드 감사 로그 API와 연결하여
            실제 데이터 기반으로 확장할 수 있습니다.
          </p>
        </section>

        <section className="large-card">
          <h2>최근 로그</h2>

          <div className="log-table-wrapper">
            <table className="log-table">
              <thead>
                <tr>
                  <th>시간</th>
                  <th>유형</th>
                  <th>설명</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="log-time">{log.time}</td>
                    <td className="log-type">{log.type}</td>
                    <td className="log-description">{log.description}</td>
                    <td className="log-status">
                      <span className={getStatusClassName(log.status)}>{log.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}