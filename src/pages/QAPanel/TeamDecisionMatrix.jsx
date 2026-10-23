import {
  QA_CATEGORIES,
  QA_CLASSIFICATION_METADATA,
} from "./qaSuites";
import ProjectIcon from "../../components/ui/ProjectIcon";

export default function TeamDecisionMatrix({
  testSuites = [],
  testResults = {},
  onSelectCategory,
  onRunCategorySuites,
  selectedCategory,
}) {
  const categories = [
    QA_CATEGORIES.FRONTEND,
    QA_CATEGORIES.ARQUITETURA,
    QA_CATEGORIES.ENGENHARIA,
    QA_CATEGORIES.BACKEND,
    QA_CATEGORIES.DEVOPS,
    QA_CATEGORIES.CYBERSECURITY,
    QA_CATEGORIES.QA,
    QA_CATEGORIES.COMPLIANCE,
    QA_CATEGORIES.SRE,
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <ProjectIcon name="Users" size={20} className="text-amber-500" />
            <span>Matriz de Decisão Técnica por Especialidades & Squads</span>
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Mapeamento de governança e segregação de responsabilidades: dados a analisar, critérios de decisão e SLAs de cada equipe.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onSelectCategory && onSelectCategory(QA_CATEGORIES.ALL)}
          className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
        >
          <span>Ver Todos os Testes ({testSuites.length})</span>
          <ProjectIcon name="ArrowRight" size={14} className="text-amber-400" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((catKey) => {
          const meta = QA_CLASSIFICATION_METADATA[catKey];
          if (!meta) return null;

          const suitesInCategory = testSuites.filter((s) => s.category === catKey);
          const executedSuites = suitesInCategory.map((s) => testResults[s.id]).filter(Boolean);
          const passedCount = executedSuites.filter((r) => r.passed).length;
          const failedCount = executedSuites.filter((r) => !r.passed).length;

          const isSelected = selectedCategory === catKey;

          let statusBadge = (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
              PENDENTE ({suitesInCategory.length})
            </span>
          );

          if (executedSuites.length > 0) {
            if (failedCount > 0) {
              statusBadge = (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-950/80 text-rose-300 border border-rose-800/80 flex items-center gap-1">
                  <ProjectIcon name="AlertCircle" size={12} className="text-rose-400" />
                  <span>{failedCount} FALHA{failedCount > 1 ? "S" : ""}</span>
                </span>
              );
            } else if (passedCount === suitesInCategory.length) {
              statusBadge = (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 flex items-center gap-1">
                  <ProjectIcon name="CheckCircle2" size={12} className="text-emerald-400" />
                  <span>100% CONFORME</span>
                </span>
              );
            } else {
              statusBadge = (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-950/80 text-amber-300 border border-amber-800/80 flex items-center gap-1">
                  <ProjectIcon name="Clock" size={12} className="text-amber-400" />
                  <span>{passedCount}/{suitesInCategory.length} OK</span>
                </span>
              );
            }
          }

          return (
            <div
              key={catKey}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                isSelected
                  ? "bg-neutral-900 border-amber-500 shadow-lg shadow-amber-500/10"
                  : "bg-neutral-900/70 border-neutral-800 hover:border-neutral-700"
              }`}
            >
              <div className="space-y-3">
                {/* Header da Squad */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ProjectIcon name={meta.icon} size={22} className="text-amber-500 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm text-white">{meta.name}</h4>
                      <span className="text-[11px] font-semibold text-amber-400 block">
                        {meta.targetSquad}
                      </span>
                    </div>
                  </div>
                  {statusBadge}
                </div>

                {/* Papéis Envolvidos */}
                <div className="text-[11px] text-neutral-400">
                  <strong className="text-neutral-300">Papéis: </strong>
                  <span>{meta.roles.join(", ")}</span>
                </div>

                {/* Dados a Analisar */}
                <div className="p-2.5 rounded-lg bg-neutral-950/70 border border-neutral-800/80 text-xs">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 mb-1 flex items-center gap-1.5">
                    <ProjectIcon name="BarChart" size={12} className="text-amber-400" />
                    <span>O que a equipe deve analisar:</span>
                  </span>
                  <p className="text-neutral-300 text-[11px] leading-relaxed">
                    {meta.missionAndDataToAnalyze}
                  </p>
                </div>

                {/* Critério de Decisão */}
                <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/30 text-xs">
                  <span className="text-[10px] uppercase font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                    <ProjectIcon name="Crosshair" size={12} className="text-amber-400" />
                    <span>Tomada de Decisão Técnica:</span>
                  </span>
                  <p className="text-amber-200/90 text-[11px] leading-relaxed">
                    {meta.decisionCriteria}
                  </p>
                </div>

                {/* Normas e SLA */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-neutral-400 pt-1">
                  <span>
                    <strong>SLA Padrão: </strong>
                    <span className="text-neutral-300">{meta.defaultSla}</span>
                  </span>
                  <span>
                    <strong>Normas: </strong>
                    <span className="text-neutral-300">{meta.standards.slice(0, 2).join(", ")}</span>
                  </span>
                </div>
              </div>

              {/* Ações da Squad */}
              <div className="pt-3 mt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectCategory && onSelectCategory(catKey)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
                  }`}
                >
                  {isSelected ? (
                    <>
                      <span>Filtrado</span>
                      <ProjectIcon name="Check" size={12} className="text-amber-300" />
                    </>
                  ) : (
                    <span>Filtrar Suítes</span>
                  )}
                </button>

                {onRunCategorySuites && (
                  <button
                    type="button"
                    onClick={() => onRunCategorySuites(catKey)}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 px-2.5 py-1.5 rounded hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <ProjectIcon name="Play" size={12} className="text-amber-400" />
                    <span>Executar ({suitesInCategory.length})</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
