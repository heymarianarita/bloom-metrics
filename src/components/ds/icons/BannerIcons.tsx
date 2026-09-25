import * as React from "react";

interface IconProps {
  className?: string;
  size?: number;
}

export const InfoFilledIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <circle cx="12" cy="8" r="1.25" fill="white" />
    <path d="M12 11V16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const SuccessFilledIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const WarningFilledIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 3L22 21H2L12 3Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
    <path d="M12 10V14" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="17" r="1" fill="white" />
  </svg>
);

export const ErrorFilledIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <path d="M12 8V13" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="16" r="1" fill="white" />
  </svg>
);
