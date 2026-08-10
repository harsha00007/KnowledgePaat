import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white text-[var(--color-text)] shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-hover)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-col space-y-2 p-6 ${className}`} {...props} />;
}

export function CardTitle({ className = '', ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-lg font-semibold leading-tight text-slate-900 tracking-tight ${className}`}
      {...props}
    />
  );
}

export function CardContent({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-6 pt-0 ${className}`} {...props} />;
}

export function CardFooter({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex items-center p-6 pt-0 ${className}`} {...props} />;
}