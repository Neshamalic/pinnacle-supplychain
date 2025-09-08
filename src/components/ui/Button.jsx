// src/components/ui/Button.jsx
import React from "react";
import clsx from "clsx";
import Icon from "../AppIcon";

export default function Button({
  children,
  variant = "default",
  size = "md",
  className = "",
  onClick,
  disabled = false,
  type = "button",
  iconName,
  iconPosition = "left",
  ...rest
}) {
  const base =
    "inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50";

  const variants = {
    default: "bg-primary text-primary-foreground hover:opacity-90",
    outline: "border border-border text-foreground bg-transparent hover:bg-muted",
    ghost: "bg-transparent text-foreground hover:bg-muted",
  };

  const sizes = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-5 text-base",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={clsx(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {iconName && iconPosition === "left" && (
        <Icon name={iconName} size={16} className="mr-2" />
      )}
      {children}
      {iconName && iconPosition === "right" && (
        <Icon name={iconName} size={16} className="ml-2" />
      )}
    </button>
  );
}
