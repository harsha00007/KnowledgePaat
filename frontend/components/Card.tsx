import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-[var(--shadow-sm)] transition-shadow duration-200 hover:shadow-[var(--shadow-md)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />;
}

export function CardTitle({ className = '', ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-lg font-semibold leading-tight tracking-tight text-[var(--color-text-primary)] ${className}`}
      {...props}
    />
  );
}

export function CardContent({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-6 pt-0 text-[var(--color-text-secondary)] ${className}`} {...props} />;
}

export function CardFooter({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex items-center p-6 pt-0 ${className}`} {...props} />;
}