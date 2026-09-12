import { tabsStyles } from "./Tabs.styles";

export default function Tabs({
  tabs = [], // Array de objetos: [{ id, label, icon, badge }]
  activeTab,
  onChange,
  variant = "line", // 'line' ou 'pill'
  className = "",
}) {
  const isLine = variant === "line";
  const styles = isLine ? tabsStyles.tabLine : tabsStyles.tabPill;

  return (
    <div className={`${tabsStyles.scrollContainer} ${className}`}>
      <div
        role="tablist"
        aria-orientation="horizontal"
        className={
          tabsStyles.listWrapper[variant] || tabsStyles.listWrapper.line
        }
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          // Define as cores do badge conforme o estado e a variante
          const badgeStyle = isLine
            ? isActive
              ? tabsStyles.badge.activeLine
              : tabsStyles.badge.inactiveLine
            : isActive
              ? tabsStyles.badge.activePill
              : tabsStyles.badge.inactivePill;

          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              onClick={() => onChange(tab.id)}
              className={`
                ${styles.base}
                ${isActive ? styles.active : styles.inactive}
              `}
            >
              {tab.icon && <span className={tabsStyles.icon}>{tab.icon}</span>}
              <span>{tab.label}</span>

              {/* Badge opcional de contador */}
              {tab.badge !== undefined && (
                <span className={`${tabsStyles.badge.base} ${badgeStyle}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
