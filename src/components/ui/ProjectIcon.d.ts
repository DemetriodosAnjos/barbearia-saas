import React from 'react';

export interface ProjectIconProps {
  name: string;
  size?: number | string;
  className?: string;
  colorVariant?: string;
  strokeWidth?: number;
  onClick?: () => void;
}

declare const ProjectIcon: React.FC<ProjectIconProps>;
export default ProjectIcon;

export const EMOJI_TO_ICON_MAP: Record<string, string>;
