import React, { useEffect, useMemo, useState } from 'react';
import { FiClock, FiSearch, FiShield } from 'react-icons/fi';
import { DataTable, ToastMessage } from '../../components/ui';
import { apiRequest } from '../../utils/api';

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [query, setQuery] = useState('');
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const response = await apiRequest('/audit-logs?limit=200');
        setLogs(response.data || []);
      } catch (error) {
        setFeedback({ type: 'error', text: error.message || 'Unable to load audit logs.' });
      }
    };

    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return logs;

    return logs.filter((log) =>
      [log.actorUsername, log.actorRole, log.action, log.entityType, log.entityId, log.message]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [logs, query]);

  const columns = [
    { header: 'When', accessor: 'createdAt', render: (row) => new Date(row.createdAt).toLocaleString() },
    { header: 'Actor', accessor: 'actorUsername' },
    { header: 'Role', accessor: 'actorRole' },
    { header: 'Action', accessor: 'action' },
    { header: 'Entity', accessor: 'entityType' },
    { header: 'Reference', accessor: 'entityId' },
    { header: 'Details', accessor: 'message' },
    {
      header: 'Metadata',
      accessor: 'metadata',
      render: (row) =>
        row.metadata && Object.keys(row.metadata).length > 0 ? (
          <pre className="max-w-[280px] whitespace-pre-wrap break-words rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
            {JSON.stringify(row.metadata, null, 2)}
          </pre>
        ) : (
          <span className="text-slate-400">No metadata</span>
        ),
    },
  ];

  return (
    <div className="page-stack">
      <ToastMessage type={feedback.type} text={feedback.text} onClose={() => setFeedback({ type: '', text: '' })} />

      <section className="section-card">
        <div className="panel-header">
          <div>
            <h3 className="panel-title inline-flex items-center gap-2">
              <FiShield className="text-red-600" />
              Audit trail
            </h3>
            <p className="panel-copy inline-flex items-center gap-1.5">
              <FiClock />
              Every important admin and operational action is logged here for traceability.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <FiSearch className="form-field-icon" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search audit logs"
              className="form-field-with-icon"
            />
          </div>
        </div>

        <DataTable columns={columns} data={filteredLogs} />
      </section>
    </div>
  );
};

export default AuditLog;
