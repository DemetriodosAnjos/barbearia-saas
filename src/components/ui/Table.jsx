import { useState } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { tableStyles } from "./Table.styles";
import Skeleton from "./Skeleton";
import Button from "./Button";
import ProjectIcon from "./ProjectIcon";

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

  // 2. Manipulação de Seleção
  const isAllSelected =
    data.length > 0 && selectedIds.length === data.length;

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

  return (
    <div className={`${tableStyles.container} ${className}`}>
      {/* Barra de Ações em Lote (Bulk Actions) */}
      {selectedIds.length > 0 && (
        <div className={tableStyles.bulkActionsBar}>
          <div className="flex items-center gap-2">
            <span className={tableStyles.bulkSelectedCount}>
              {selectedIds.length} selecionado(s)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {bulkActions || (
              <Button
                variant="danger"
                size="sm"
                onClick={() =>
                  alert(`Ação em massa executada para ${selectedIds.length} itens.`)
                }
              >
                Excluir Selecionados
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Container Rolável Horizontalmente com Suporte Touch */}
      <div className={tableStyles.tableWrapper}>
        <table className={tableStyles.table}>
          {/* CABEÇALHO */}
          <thead className={tableStyles.thead}>
            <tr>
              {/* Checkbox "Selecionar Todos" */}
              {selectable && (
                <th className={tableStyles.checkboxTh}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    aria-label="Selecionar todas as linhas"
                    className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                  />
                </th>
              )}

              {/* Colunas de Dados */}
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
                      <span className="text-neutral-500 hover:text-amber-400 transition-colors">
                        {sortConfig.key === col.key ? (
                          sortConfig.direction === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-amber-500" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-amber-500" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-neutral-600 hover:text-amber-400" />
                        )}
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
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className={tableStyles.tr}>
                  {selectable && (
                    <td className={tableStyles.td}>
                      <Skeleton className="w-4 h-4 rounded" />
                    </td>
                  )}
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className={tableStyles.td}>
                      <Skeleton className="h-4 w-full rounded" />
                    </td>
                  ))}
                  {actions.length > 0 && (
                    <td className={tableStyles.stickyActionTd}>
                      <Skeleton className="h-6 w-12 rounded" />
                    </td>
                  )}
                </tr>
              ))
            ) : sortedData.length > 0 ? (
              /* Linhas Normais */
              sortedData.map((row, index) => {
                const isSelected = selectedIds.includes(row[keyField]);
                return (
                  <tr
                    key={row[keyField] || index}
                    className={`
                      ${tableStyles.tr}
                      ${isSelected ? tableStyles.trSelected : ""}
                    `}
                  >
                    {/* Checkbox da Linha */}
                    {selectable && (
                      <td className={tableStyles.td}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(row[keyField])}
                          aria-label={`Selecionar ${row.name || "linha"}`}
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
                              {typeof act.icon === "string" ? (
                                <ProjectIcon
                                  name={act.icon}
                                  size={15}
                                  colorVariant={act.isDanger ? "danger" : "amber"}
                                />
                              ) : (
                                act.icon
                              )}
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
