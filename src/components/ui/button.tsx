import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-orange text-white shadow-sm hover:bg-orange-dark",
        secondary: "border border-line bg-white text-ink shadow-card hover:border-[#d9d1c4] hover:bg-[#fdfcf9]",
        ghost: "text-ink-soft hover:bg-cream-dark/70",
        subtle: "bg-cream-dark/70 text-ink hover:bg-cream-dark",
        success: "bg-green text-white shadow-sm hover:bg-green-dark",
        danger: "bg-danger text-white shadow-sm hover:bg-[#9f3c33]",
        "danger-ghost": "text-danger hover:bg-danger-soft",
        dark: "bg-ink text-cream hover:bg-ink-soft",
        link: "text-orange-dark underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-9.5 px-4 text-sm",
        lg: "h-11 px-5 text-[15px]",
        xl: "h-13 px-6 text-base rounded-xl",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, loadingText, children, disabled, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot.Root ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props}>
          {children}
        </Slot.Root>
      );
    }
    return (
      <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
        {loading ? (
          <>
            <Loader2 className="animate-spin" />
            {loadingText ?? children}
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);
Button.displayName = "Button";
