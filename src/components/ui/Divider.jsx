import { dividerStyles } from "./Divider.styles";

export default function Divider({
  orientation = "horizontal", // 'horizontal' ou 'vertical'
  label, // Texto opcional (ex: "OU")
  className = "",
}) {
  // Divisor Vertical
  if (orientation === "vertical") {
    return (
      <span
        role="separator"
        aria-orientation="vertical"
        className={`${dividerStyles.vertical} ${className}`}
      />
    );
  }

  // Divisor Horizontal com Rótulo
  if (label) {
    return (
      <div
        role="separator"
        aria-orientation="horizontal"
        className={`${dividerStyles.labeledContainer} ${className}`}
      >
        <span className={dividerStyles.line} />
        <span className={dividerStyles.label}>{label}</span>
        <span className={dividerStyles.line} />
      </div>
    );
  }

  // Divisor Horizontal Padrão
  return (
    <hr
      role="separator"
      aria-orientation="horizontal"
      className={`${dividerStyles.horizontal} ${className}`}
    />
  );
}
