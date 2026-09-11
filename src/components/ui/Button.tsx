import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "gold";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-teal-900 text-white hover:bg-teal-800 active:bg-teal-950",
  secondary: "bg-teal-500 text-white hover:bg-teal-600 active:bg-teal-700",
  outline:
    "border border-ink-300 bg-white text-ink-900 hover:border-teal-900 hover:text-teal-900",
  ghost: "text-ink-700 hover:bg-ink-100 hover:text-ink-900",
  gold: "bg-gold-500 text-ink-900 hover:bg-gold-400 active:bg-gold-600",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded font-medium tracking-wide transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      {...props}
    />
  );
}

interface ButtonLinkProps extends React.ComponentProps<typeof Link> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      {...props}
    />
  );
}
