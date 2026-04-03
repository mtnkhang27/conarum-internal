"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: '!border !border-border/50 !shadow-lg !rounded-xl',
          title: '!font-semibold',
          success: 'border-l-4 !border-l-success !bg-success-bg !text-success',
          error: 'border-l-4 !border-l-destructive !bg-error-bg !text-destructive',
          warning: 'border-l-4 !border-l-warning !bg-warning-bg !text-warning',
          info: 'border-l-4 !border-l-info !bg-info-bg !text-info',
          description: '!text-current !opacity-80',
        },
      }}
      style={
        {
          "--normal-bg": "#ffffff",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
