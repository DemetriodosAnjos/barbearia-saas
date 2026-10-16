import { tabsStyles } from "./Tabs.styles";

export default function Tabs({
  tabs = [], // Array de objetos: [{ id, label, icon, badge }]
  activeTab,
  onChange,
  variant = "line", // 'line' ou 'pill'
  className = "",
}) {
  const isProfile = variant === "profile" || className.includes("profile-tabs");
  const isSettings = variant === "settings" || className.includes("settings-tabs");
  const isLine = variant === "line";
  const styles = isSettings
    ? (tabsStyles.tabSettings || tabsStyles.tabLine)
    : isProfile
      ? tabsStyles.tabProfile
      : isLine
        ? tabsStyles.tabLine
        : tabsStyles.tabPill;

  return (
    <div className={`${tabsStyles.scrollContainer} ${className}`}>
      <div
        role="tablist"
        aria-orientation="horizontal"
        className={
          tabsStyles.listWrapper[variant] ||
          (isSettings
            ? tabsStyles.listWrapper.settings
            : isProfile
              ? tabsStyles.listWrapper.profile
              : tabsStyles.listWrapper.line)
        }
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          // Define as cores do badge conforme o estado e a variante
          const badgeStyle = isProfile || isSettings || isLine
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
              data-profile-tab={isProfile ? tab.id : undefined}
              data-settings-tab={isSettings ? tab.id : undefined}
              className={`
                ${styles.base}
                ${isActive ? styles.active : styles.inactive}
                ${isSettings ? (isActive ? "settings-tab-active" : "settings-tab-inactive") : ""}
              `}
            >
              {tab.icon && (
                <span
                  data-tab-icon={tab.id}
                  className={`
                    ${tabsStyles.icon}
                    ${isProfile ? "profile-tab-icon" : ""}
                    ${isSettings ? "settings-tab-icon" : ""}
                    ${
                      isProfile
                        ? isActive
                          ? "text-[#059669] dark:text-amber-400"
                          : "text-[#52525B] group-hover:text-[#262626] dark:text-neutral-400 dark:group-hover:text-neutral-200"
                        : ""
                    }
                    ${
                      isSettings
                        ? isActive
                          ? "text-[#059669] dark:text-amber-400"
                          : "text-[#52525B] group-hover:text-[#262626] dark:text-neutral-400 dark:group-hover:text-neutral-200"
                        : ""
                    }
                  `}
                >
                  {tab.icon}
                </span>
              )}
              <span
                data-tab-title={tab.id}
                className={`
                  ${isProfile ? "profile-tab-title" : ""}
                  ${isSettings ? "settings-tab-title" : ""}
                  ${
                    isProfile
                      ? isActive
                        ? "text-[#059669] dark:text-amber-400 font-bold"
                        : "text-[#52525B] group-hover:text-[#262626] dark:text-neutral-400 dark:group-hover:text-neutral-200 font-semibold"
                      : ""
                  }
                  ${
                    isSettings
                      ? isActive
                        ? "text-[#059669] dark:text-amber-400 font-bold"
                        : "text-[#52525B] group-hover:text-[#262626] dark:text-neutral-400 dark:group-hover:text-neutral-200 font-semibold"
                      : ""
                  }
                `}
              >
                {tab.label}
              </span>

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
