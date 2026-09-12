import { useState } from "react";
import { tableStyles } from "./Table.styles";
import Skeleton from "./Skeleton";
import Button from "./Button";

export default function Table({
  columns = [], // [{ key, label, sortable, render: (row) => ... }]
  data = [],
  keyField = "id",
  selectable = true,
  selectedIds = [],
  onSelectionChange,
  actions = [], // [{ label, icon, onClick: (row) => ..., isDanger }]
  bulkActions, // JSX opcional para a barra de ações em lote
  isLoading = false,
  emptyMessage = "Nenhum registro encontrado.",
  className = "",
}) {
  // Controle interno de Ordenação (se desejar ordenar localmente)
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const handleSort = (columnKey) => {
    let direction = "asc";
    if (sortConfig.key === columnKey && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key: columnKey, direction });
  };

  // 1. Dados ordenados
  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const valA = a[sortConfig.key];
    const valB = b[sortConfig.key];

    if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
    if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  // 2. Seleção em Massa (Checkbox Mestre e por linha)
  const handleSelectAll = (e) => {
    if (!onSelectionChange) return;
    if (e.target.checked) {
      onSelectionChange(data.map((item) => item[keyField]));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((item) => item !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const isAllSelected = data.length > 0 && selectedIds.length === data.length;
  const hasSelections = selectedIds.length > 0;

  return (
    <div className={`${tableStyles.container} ${className}`}>
      {/* 1. BARRA DE AÇÕES EM LOTE (BULK ACTIONS) */}
      {selectable && hasSelections && (
        <div className={tableStyles.bulkBar}>
          <div className={tableStyles.bulkInfo}>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              {selectedIds.length}{" "}
              {selectedIds.length === 1
                ? "item selecionado"
                : "itens selecionados"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {bulkActions}
            <button
              type="button"
              onClick={() => onSelectionChange([])}
              className="text-neutral-400 hover:text-white underline cursor-pointer text-xs ml-2"
            >
              Desmarcar todos
            </button>
          </div>
        </div>
      )}

      {/* 2. ÁREA DE ROLAGEM HORIZONTAL COM TABELA */}
      <div className={tableStyles.scrollArea}>
        <table className={tableStyles.table}>
          {/* CABEÇALHO */}
          <thead className={tableStyles.thead}>
            <tr>
              {/* Checkbox Mestre */}
              {selectable && (
                <th className="w-10 py-3.5 px-4">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    disabled={isLoading || data.length === 0}
                    className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                  />
                </th>
              )}

              {/* Colunas Dinâmicas */}
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={`
                    ${tableStyles.th}
                    ${col.sortable ? tableStyles.thSortable : ""}
                  `}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.label}</span>
                    {col.sortable && (
                      <span className="text-neutral-600 text-[10px]">
                        {sortConfig.key === col.key
                          ? sortConfig.direction === "asc"
                            ? "▲"
                            : "▼"
                          : "↕"}
                      </span>
                    )}
                  </div>
                </th>
              ))}

              {/* Coluna de Ações Fixa no Canto Direito */}
              {actions.length > 0 && (
                <th className={tableStyles.stickyActionTh}>Ações</th>
              )}
            </tr>
          </thead>

          {/* CORPO DA TABELA */}
          <tbody>
            {isLoading ? (
              /* Linhas de Esqueleto no Carregamento */
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`skel-${i}`} className={tableStyles.tr}>
                  {selectable && (
                    <td className="px-4 py-3">
                      <Skeleton variant="rounded" width="16px" height="16px" />
                    </td>
                  )}
                  {columns.map((col, idx) => (
                    <td key={idx} className={tableStyles.td}>
                      <Skeleton variant="text" width="80%" height="14px" />
                    </td>
                  ))}
                  {actions.length > 0 && (
                    <td className={tableStyles.stickyActionTd}>
                      <Skeleton
                        variant="rounded"
                        width="60px"
                        height="24px"
                        className="ml-auto"
                      />
                    </td>
                  )}
                </tr>
              ))
            ) : sortedData.length > 0 ? (
              /* Linhas com Dados Reais */
              sortedData.map((row) => {
                const isSelected = selectedIds.includes(row[keyField]);

                return (
                  <tr
                    key={row[keyField]}
                    className={`
                      ${tableStyles.tr}
                      ${isSelected ? tableStyles.trSelected : ""}
                    `}
                  >
                    {/* Checkbox de Seleção Individual */}
                    {selectable && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(row[keyField])}
                          className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                        />
                      </td>
                    )}

                    {/* Dados das Colunas */}
                    {columns.map((col) => (
                      <td key={col.key} className={tableStyles.td}>
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}

                    {/* Ações Fixas na Direita */}
                    {actions.length > 0 && (
                      <td className={tableStyles.stickyActionTd}>
                        <div className={tableStyles.actionsGroup}>
                          {actions.map((act, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => act.onClick(row)}
                              title={act.label}
                              className={
                                act.isDanger
                                  ? tableStyles.actionBtnDanger
                                  : tableStyles.actionBtn
                              }
                            >
                              {act.icon}
                            </button>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              /* Estado Vazio */
              <tr>
                <td
                  colSpan={
                    columns.length +
                    (selectable ? 1 : 0) +
                    (actions.length > 0 ? 1 : 0)
                  }
                  className={tableStyles.emptyState}
                >
                  <p className="font-bold text-neutral-300">
                    Nenhum dado encontrado
                  </p>
                  <p className="text-neutral-500">{emptyMessage}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
