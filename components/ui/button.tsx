import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
};

export function Button({ className, isLoading, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn("ta-button", className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? "Signing in..." : children}
    </button>
  );
}
