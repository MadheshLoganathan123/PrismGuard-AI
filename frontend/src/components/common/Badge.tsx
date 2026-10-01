import React from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, ShieldAlert, FileText, Ban } from 'lucide-react';
import type { DecisionType } from '../../types';

interface BadgeProps {
  decision: DecisionType;
  showIcon?: boolean;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({ decision, showIcon = true, style }) => {
  switch (decision) {
    case 'ALLOW':
      return (
        <span className="badge badge-allow" style={style}>
          {showIcon && <CheckCircle size={11} />}
          <span>ALLOWED</span>
        </span>
      );
    case 'WARN':
      return (
        <span className="badge badge-warn" style={style}>
          {showIcon && <AlertTriangle size={11} />}
          <span>WARN</span>
        </span>
      );
    case 'REVIEW':
      return (
        <span className="badge badge-review" style={style}>
          {showIcon && <AlertCircle size={11} />}
          <span>REVIEW</span>
        </span>
      );
    case 'REVIEW_GUARD_BLOCK':
      return (
        <span className="badge badge-review" style={style}>
          {showIcon && <ShieldAlert size={11} />}
          <span>REVIEW (GUARD BLOCK)</span>
        </span>
      );
    case 'BLOCK':
      return (
        <span className="badge badge-block" style={style}>
          {showIcon && <Ban size={11} />}
          <span>BLOCK</span>
        </span>
      );
    case 'REDACT':
      return (
        <span className="badge badge-info" style={style}>
          {showIcon && <FileText size={11} />}
          <span>REDACT</span>
        </span>
      );
    default:
      return (
        <span className="badge badge-info" style={style}>
          <span>{decision}</span>
        </span>
      );
  }
};
