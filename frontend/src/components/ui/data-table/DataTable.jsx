import React from 'react';

/**
 * Reusable DataTable Component
 * @param {Array} columns - Array of objects defining column headers and data keys.
 * @param {Array} data - The array of data objects to display.
 * @param {Function} renderActions - Optional function that returns JSX for action buttons.
 */
const DataTable = ({ columns, data, renderActions }) => {
  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">No records found.</p>
        <p className="empty-state-copy">New activity will appear here once records are added to the system.</p>
      </div>
    );
  }

  return (
    <div className="table-shell">
      <table className="table-base">
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th key={index}>
                {col.header}
              </th>
            ))}
            {renderActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((col, colIndex) => (
                <td key={colIndex} className={colIndex === 0 ? 'font-semibold text-slate-800' : ''}>
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
              {renderActions && <td>{renderActions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;

