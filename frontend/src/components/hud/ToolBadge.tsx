import React from 'react';
import { BackgroundTask } from '../../types';

interface ToolBadgeProps {
  activeTool?: string | null;
  activeTasks?: BackgroundTask[];
  themeColor?: string;
}

export const ToolBadge: React.FC<ToolBadgeProps> = ({
  activeTool,
  activeTasks = [],
  themeColor = '#00f0ff',
}) => {
  // Determine if there is a running tool or background task
  const currentTask = activeTasks.find((t) => t.status === 'running');
  const toolName = activeTool || (currentTask ? (currentTask.title || currentTask.prompt || currentTask.type) : null);

  if (!toolName) {
    return null;
  }

  const cleanName = toolName.replace(/[_-]/g, ' ');

  return (
    <div className="tool-badge animate-in fade-in slide-in-from-top-3 duration-200">
      <span className="tool-kicker">
        <span className="spinner-hud" style={{ borderColor: themeColor, borderTopColor: 'transparent' }} />
        <span>accessing</span>
      </span>
      <span className="tool-name">{cleanName}</span>
    </div>
  );
};

export default ToolBadge;
