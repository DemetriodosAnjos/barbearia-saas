import { skeletonStyles } from "./Skeleton.styles";

export default function Skeleton({
  variant = "rounded", // 'text' | 'circular' | 'rounded' | 'rectangular'
  width,
  height,
  animation = "pulse", // 'pulse' | 'none'
  className = "",
  style = {},
  ...props
}) {
  const variantClass =
    skeletonStyles.variants[variant] || skeletonStyles.variants.rounded;
  const animationClass =
    skeletonStyles.animations[animation] || skeletonStyles.animations.pulse;

  const inlineStyles = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...style,
  };

  return (
    <div
      aria-hidden="true"
      style={inlineStyles}
      className={`
        ${skeletonStyles.base}
        ${variantClass}
        ${animationClass}
        ${className}
      `}
      {...props}
    />
  );
}
