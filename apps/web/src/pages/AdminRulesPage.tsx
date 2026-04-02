import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type RiskLevel = 'NOTE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type Category =
  | 'PROMPT_INJECTION'
  | 'SYSTEM_PROMPT_EXTRACTION'
  | 'JAILBREAK'
  | 'DATA_EXFILTRATION'
  | 'AMBIGUOUS_REQUEST'
  | 'POLICY_BYPASS'
  | 'SENSITIVE_DATA'
  | 'CUSTOM';

type Rule = {
  id: string;
  pattern: string;
  category: Category;
  riskLevel: RiskLevel;
  enabled: boolean;
  injectionWeight?: number;
  ambiguityWeight?: number;
  owaspRiskScore?: number;
  createdAt: string;
  updatedAt: string;
};

type RuleForm = {
  pattern: string;
  category: Category;
  enabled: boolean;
};

const API_BASE_URL = 'http://localhost:3000';
function adminHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem('admin_access_token');
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

const CATEGORIES: Category[] = [
  'PROMPT_INJECTION',
  'SYSTEM_PROMPT_EXTRACTION',
  'JAILBREAK',
  'DATA_EXFILTRATION',
  'AMBIGUOUS_REQUEST',
  'POLICY_BYPASS',
  'SENSITIVE_DATA',
  'CUSTOM',
];

const initialForm: RuleForm = {
  pattern: '',
  category: 'PROMPT_INJECTION',
  enabled: true,
};

function formatWeight(value?: number): string {
  if (value === undefined || value === null) return '-';
  return value.toFixed(3);
}

export default function AdminRulesPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [recalculatingId, setRecalculatingId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const [form, setForm] = useState<RuleForm>(initialForm);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<RuleForm>(initialForm);

  const [search, setSearch] = useState<string>('');

  const filteredRules = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return rules;

    return rules.filter((rule) => {
      return (
        rule.pattern.toLowerCase().includes(keyword) ||
        rule.category.toLowerCase().includes(keyword) ||
        rule.riskLevel.toLowerCase().includes(keyword) ||
        String(rule.enabled).includes(keyword)
      );
    });
  }, [rules, search]);

  useEffect(() => {
    void fetchRules();
  }, []);

  async function fetchRules() {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE_URL}/admin/rules`, {
        method: 'GET',
        headers: adminHeaders(),
      });

      if (!response.ok) {
        throw new Error('룰 목록을 불러오지 못했습니다.');
      }

      const data: Rule[] = await response.json();
      setRules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '룰 목록 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function clearMessages() {
    setError('');
    setSuccessMessage('');
  }

  function handleFormChange<K extends keyof RuleForm>(key: K, value: RuleForm[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleEditFormChange<K extends keyof RuleForm>(key: K, value: RuleForm[K]) {
    setEditForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleCreateRule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearMessages();

    if (!form.pattern.trim()) {
      setError('pattern을 입력해야 합니다.');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`${API_BASE_URL}/admin/rules`, {
        method: 'POST',
        headers: adminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          pattern: form.pattern.trim(),
          category: form.category,
          enabled: form.enabled,
        }),
      });

      if (!response.ok) {
        throw new Error('룰 추가에 실패했습니다.');
      }

      const createdRule: Rule = await response.json();

      setRules((prev) => [createdRule, ...prev]);
      setForm(initialForm);
      setSuccessMessage('룰이 성공적으로 추가되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '룰 추가 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(rule: Rule) {
    clearMessages();
    setEditingId(rule.id);
    setEditForm({
      pattern: rule.pattern,
      category: rule.category,
      enabled: rule.enabled,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(initialForm);
  }

  async function handleUpdateRule(id: string) {
    clearMessages();

    if (!editForm.pattern.trim()) {
      setError('pattern을 입력해야 합니다.');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`${API_BASE_URL}/admin/rules/${id}`, {
        method: 'PATCH',
        headers: adminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          pattern: editForm.pattern.trim(),
          category: editForm.category,
          enabled: editForm.enabled,
        }),
      });

      if (!response.ok) {
        throw new Error('룰 수정에 실패했습니다.');
      }

      const updatedRule: Rule = await response.json();

      setRules((prev) => prev.map((rule) => (rule.id === id ? updatedRule : rule)));

      setEditingId(null);
      setEditForm(initialForm);
      setSuccessMessage('룰이 성공적으로 수정되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '룰 수정 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteRule(id: string) {
    clearMessages();

    const confirmed = window.confirm('이 룰을 삭제하시겠습니까?');
    if (!confirmed) return;

    try {
      setSubmitting(true);

      const response = await fetch(`${API_BASE_URL}/admin/rules/${id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });

      if (!response.ok) {
        throw new Error('룰 삭제에 실패했습니다.');
      }

      setRules((prev) => prev.filter((rule) => rule.id !== id));
      setSuccessMessage('룰이 성공적으로 삭제되었습니다.');

      if (editingId === id) {
        cancelEdit();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '룰 삭제 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleRule(rule: Rule) {
    clearMessages();

    try {
      const response = await fetch(`${API_BASE_URL}/admin/rules/${rule.id}`, {
        method: 'PATCH',
        headers: adminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          enabled: !rule.enabled,
        }),
      });

      if (!response.ok) {
        throw new Error('활성/비활성 변경에 실패했습니다.');
      }

      const updatedRule: Rule = await response.json();

      setRules((prev) => prev.map((item) => (item.id === rule.id ? updatedRule : item)));
      setSuccessMessage('활성화 상태가 변경되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '상태 변경 중 오류가 발생했습니다.');
    }
  }

  async function handleRecalculate(id: string) {
    clearMessages();

    try {
      setRecalculatingId(id);

      const response = await fetch(`${API_BASE_URL}/admin/rules/${id}/recalculate`, {
        method: 'POST',
        headers: adminHeaders(),
      });

      if (!response.ok) {
        throw new Error('위험도 재계산에 실패했습니다.');
      }

      const updatedRule: Rule = await response.json();

      setRules((prev) => prev.map((rule) => (rule.id === id ? updatedRule : rule)));
      setSuccessMessage('위험도가 재계산되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '위험도 재계산 중 오류가 발생했습니다.');
    } finally {
      setRecalculatingId(null);
    }
  }

  function handleLogout() {
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_name');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_logged_in');
    navigate('/admin/login');
  }

  function formatDate(value: string) {
    try {
      return new Date(value).toLocaleString('ko-KR');
    } catch {
      return value;
    }
  }

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div>
          <h1 style={styles.logo}>PromptGuard</h1>
          <p style={styles.logoSub}>관리자 콘솔</p>
        </div>

        <nav style={styles.nav}>
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
            style={
              location.pathname === '/admin/dashboard'
                ? { ...styles.navButton, ...styles.navButtonActive }
                : styles.navButton
            }
          >
            대시보드
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/rules')}
            style={
              location.pathname === '/admin/rules'
                ? { ...styles.navButton, ...styles.navButtonActive }
                : styles.navButton
            }
          >
            룰 관리
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/logs')}
            style={
              location.pathname === '/admin/logs'
                ? { ...styles.navButton, ...styles.navButtonActive }
                : styles.navButton
            }
          >
            로그 보기
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/settings')}
            style={
              location.pathname === '/admin/settings'
                ? { ...styles.navButton, ...styles.navButtonActive }
                : styles.navButton
            }
          >
            설정
          </button>
        </nav>
      </aside>

      <main style={styles.main}>
        <div style={styles.headerRow}>
          <div>
            <h2 style={styles.title}>룰 관리</h2>
            <p style={styles.subtitle}>프롬프트 인젝션 탐지 룰을 추가, 수정, 삭제할 수 있습니다.</p>
          </div>

          <button type="button" onClick={handleLogout} style={styles.logoutButton}>
            로그아웃
          </button>
        </div>

        {error ? <div style={styles.errorBox}>{error}</div> : null}
        {successMessage ? <div style={styles.successBox}>{successMessage}</div> : null}

        <section style={styles.card}>
          <h3 style={styles.cardTitle}>새 룰 추가</h3>

          <form onSubmit={handleCreateRule} style={styles.formGrid}>
            <div style={styles.formField}>
              <label style={styles.label}>Pattern</label>
              <input
                type="text"
                value={form.pattern}
                onChange={(e) => handleFormChange('pattern', e.target.value)}
                placeholder="예: act as"
                style={styles.input}
              />
            </div>

            <div style={styles.formField}>
              <label style={styles.label}>Category</label>
              <select
                value={form.category}
                onChange={(e) => handleFormChange('category', e.target.value as Category)}
                style={styles.select}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formField}>
              <label style={styles.label}>Enabled</label>
              <select
                value={String(form.enabled)}
                onChange={(e) => handleFormChange('enabled', e.target.value === 'true')}
                style={styles.select}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>

            <div style={styles.formActions}>
              <button type="submit" disabled={submitting} style={styles.primaryButton}>
                {submitting ? '처리 중...' : '룰 추가'}
              </button>
            </div>
          </form>
        </section>

        <section style={styles.card}>
          <div style={styles.tableHeader}>
            <h3 style={styles.cardTitle}>룰 목록</h3>
            <input
              type="text"
              placeholder="pattern / 카테고리 / 위험도 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {loading ? (
            <div style={styles.emptyBox}>불러오는 중...</div>
          ) : filteredRules.length === 0 ? (
            <div style={styles.emptyBox}>등록된 룰이 없습니다.</div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Pattern</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Risk</th>
                    <th style={styles.th}>Inj.Weight</th>
                    <th style={styles.th}>Amb.Weight</th>
                    <th style={styles.th}>OWASP Risk</th>
                    <th style={styles.th}>Enabled</th>
                    <th style={styles.th}>Created</th>
                    <th style={styles.th}>Updated</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.map((rule) => {
                    const isEditing = editingId === rule.id;

                    return (
                      <tr key={rule.id}>
                        <td style={styles.td}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.pattern}
                              onChange={(e) => handleEditFormChange('pattern', e.target.value)}
                              style={styles.inlineInput}
                            />
                          ) : (
                            rule.pattern
                          )}
                        </td>

                        <td style={styles.td}>
                          {isEditing ? (
                            <select
                              value={editForm.category}
                              onChange={(e) =>
                                handleEditFormChange('category', e.target.value as Category)
                              }
                              style={styles.inlineSelect}
                            >
                              {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span style={styles.categoryLabel}>{rule.category}</span>
                          )}
                        </td>

                        <td style={styles.td}>
                          <span style={riskBadgeStyle(rule.riskLevel)}>{rule.riskLevel}</span>
                        </td>

                        <td style={styles.td}>
                          <span style={styles.weightValue}>{formatWeight(rule.injectionWeight)}</span>
                        </td>

                        <td style={styles.td}>
                          <span style={styles.weightValue}>{formatWeight(rule.ambiguityWeight)}</span>
                        </td>

                        <td style={styles.td}>
                          <span style={styles.owaspLabel}>{rule.owaspRiskScore ?? '-'}</span>
                        </td>

                        <td style={styles.td}>
                          {isEditing ? (
                            <select
                              value={String(editForm.enabled)}
                              onChange={(e) =>
                                handleEditFormChange('enabled', e.target.value === 'true')
                              }
                              style={styles.inlineSelect}
                            >
                              <option value="true">true</option>
                              <option value="false">false</option>
                            </select>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleToggleRule(rule)}
                              style={rule.enabled ? styles.enabledButton : styles.disabledButton}
                            >
                              {String(rule.enabled)}
                            </button>
                          )}
                        </td>

                        <td style={styles.td}>{formatDate(rule.createdAt)}</td>
                        <td style={styles.td}>{formatDate(rule.updatedAt)}</td>

                        <td style={styles.td}>
                          <div style={styles.actionGroup}>
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void handleUpdateRule(rule.id)}
                                  disabled={submitting}
                                  style={styles.smallPrimaryButton}
                                >
                                  저장
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  style={styles.smallSecondaryButton}
                                >
                                  취소
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEdit(rule)}
                                  style={styles.smallSecondaryButton}
                                >
                                  수정
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleRecalculate(rule.id)}
                                  disabled={recalculatingId === rule.id}
                                  style={styles.smallRecalcButton}
                                >
                                  {recalculatingId === rule.id ? '계산중...' : 'Recalculate'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteRule(rule.id)}
                                  disabled={submitting}
                                  style={styles.smallDangerButton}
                                >
                                  삭제
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function riskBadgeStyle(riskLevel: RiskLevel): React.CSSProperties {
  const common: React.CSSProperties = {
    display: 'inline-block',
    minWidth: '74px',
    textAlign: 'center',
    padding: '6px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
  };

  if (riskLevel === 'CRITICAL') {
    return {
      ...common,
      backgroundColor: '#5c0a0a',
      color: '#ff6b6b',
    };
  }

  if (riskLevel === 'HIGH') {
    return {
      ...common,
      backgroundColor: '#4a1d1d',
      color: '#ff9b9b',
    };
  }

  if (riskLevel === 'MEDIUM') {
    return {
      ...common,
      backgroundColor: '#4a3c14',
      color: '#ffd76a',
    };
  }

  if (riskLevel === 'LOW') {
    return {
      ...common,
      backgroundColor: '#173a2d',
      color: '#7df1b2',
    };
  }

  // NOTE
  return {
    ...common,
    backgroundColor: '#2a2d35',
    color: '#9ca3af',
  };
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    backgroundColor: '#050b22',
    color: '#ffffff',
    fontFamily: 'Arial, sans-serif',
  },
  sidebar: {
    width: '280px',
    minWidth: '280px',
    padding: '32px 20px',
    background: 'linear-gradient(180deg, #08112f 0%, #050b22 100%)',
    borderRight: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '28px',
  },
  logo: {
    margin: 0,
    fontSize: '26px',
    fontWeight: 800,
  },
  logoSub: {
    margin: '6px 0 0',
    color: '#aab7d6',
    fontSize: '15px',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  navButton: {
    width: '100%',
    padding: '16px 18px',
    borderRadius: '14px',
    backgroundColor: '#101936',
    color: '#dce6ff',
    border: 'none',
    fontSize: '16px',
    fontWeight: 700,
    textAlign: 'left',
    cursor: 'pointer',
  },
  navButtonActive: {
    backgroundColor: '#23356f',
    color: '#ffffff',
  },
  main: {
    flex: 1,
    padding: '36px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '20px',
  },
  title: {
    margin: 0,
    fontSize: '46px',
    fontWeight: 800,
    lineHeight: 1.1,
  },
  subtitle: {
    marginTop: '12px',
    color: '#aab7d6',
    fontSize: '18px',
  },
  logoutButton: {
    backgroundColor: '#ef6b77',
    color: '#ffffff',
    border: 'none',
    borderRadius: '16px',
    padding: '16px 22px',
    fontSize: '18px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  card: {
    backgroundColor: '#0f1837',
    borderRadius: '24px',
    padding: '24px',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
  },
  cardTitle: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 800,
  },
  formGrid: {
    marginTop: '20px',
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr auto',
    gap: '16px',
    alignItems: 'end',
  },
  formField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    color: '#aab7d6',
    fontWeight: 700,
  },
  input: {
    height: '48px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.12)',
    backgroundColor: '#0a1129',
    color: '#ffffff',
    padding: '0 14px',
    fontSize: '15px',
    outline: 'none',
  },
  select: {
    height: '48px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.12)',
    backgroundColor: '#0a1129',
    color: '#ffffff',
    padding: '0 14px',
    fontSize: '15px',
    outline: 'none',
  },
  formActions: {
    display: 'flex',
    alignItems: 'end',
  },
  primaryButton: {
    height: '48px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    padding: '0 18px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px',
  },
  searchInput: {
    width: '280px',
    height: '44px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.12)',
    backgroundColor: '#0a1129',
    color: '#ffffff',
    padding: '0 14px',
    fontSize: '14px',
    outline: 'none',
  },
  emptyBox: {
    padding: '28px',
    borderRadius: '16px',
    backgroundColor: '#0a1129',
    color: '#aab7d6',
    textAlign: 'center',
    fontSize: '15px',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '14px 12px',
    fontSize: '13px',
    color: '#9fb0d8',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '14px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    fontSize: '14px',
    color: '#ffffff',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  },
  inlineInput: {
    width: '100%',
    minWidth: '220px',
    height: '40px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.12)',
    backgroundColor: '#0a1129',
    color: '#ffffff',
    padding: '0 12px',
    fontSize: '14px',
    outline: 'none',
  },
  inlineSelect: {
    height: '40px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.12)',
    backgroundColor: '#0a1129',
    color: '#ffffff',
    padding: '0 12px',
    fontSize: '14px',
    outline: 'none',
  },
  actionGroup: {
    display: 'flex',
    gap: '8px',
  },
  smallPrimaryButton: {
    height: '36px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    padding: '0 12px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  smallSecondaryButton: {
    height: '36px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#334155',
    color: '#ffffff',
    padding: '0 12px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  smallRecalcButton: {
    height: '36px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#6d28d9',
    color: '#ffffff',
    padding: '0 12px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  smallDangerButton: {
    height: '36px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    padding: '0 12px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  enabledButton: {
    height: '34px',
    borderRadius: '999px',
    border: 'none',
    backgroundColor: '#173a2d',
    color: '#7df1b2',
    padding: '0 12px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  disabledButton: {
    height: '34px',
    borderRadius: '999px',
    border: 'none',
    backgroundColor: '#4a1d1d',
    color: '#ff9b9b',
    padding: '0 12px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  categoryLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#c4b5fd',
  },
  weightValue: {
    fontSize: '13px',
    fontFamily: 'monospace',
    color: '#94a3b8',
  },
  owaspLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#fb923c',
  },
  errorBox: {
    padding: '14px 18px',
    borderRadius: '14px',
    backgroundColor: '#4a1d1d',
    color: '#ffb4b4',
    fontWeight: 700,
  },
  successBox: {
    padding: '14px 18px',
    borderRadius: '14px',
    backgroundColor: '#173a2d',
    color: '#7df1b2',
    fontWeight: 700,
  },
};
