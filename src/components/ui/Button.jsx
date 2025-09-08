import React from "react";
import clsx from "clsx";
import Icon from "../AppIcon";

/**
 * Botón seguro por defecto:
 * - type="button" evita submits accidentales dentro de <form>
 * - NUNCA navega si no le pasas href (no usa href="#")
 */
export default function Button({
  as: Comp = "button",
  type = "button",
  href,
  onClick,
  variant = "default", // "default" | "outline" | "ghost"
  size = "md",         // "sm" | "md" | "lg" | "icon"
  iconName,
  iconPosition = "left",
  className = "",
  children,
  disabled = false,
  title,
  ...rest
}) {
  const base =
    "inline-flex items-center justify-center rounded-lg font-medium transition-colors " +
    "focus:outline-none disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    default: "bg-primary text-primary-foreground hover:opacity-90",
    outline: "border border-border bg-transparent text-foreground hover:bg-muted",
    ghost: "bg-transparent text-foreground hover:bg-muted",
  };

  const sizes = {
    sm: "h-8 px-2 text-sm",
    md: "h-9 px-3 text-sm",
    lg: "h-10 px-4",
    icon: "h-9 w-9 p-0",
  };

  const classes = clsx(base, variants[variant] || variants.default, sizes[size] || sizes.md, className);

  const Content = (
    <>
      {iconName && iconPosition === "left" && (
        <Icon name={iconName} size={16} className={children ? "mr-2" : ""} />
      )}
      {children}
      {iconName && iconPosition === "right" && (
        <Icon name={iconName} size={16} className={children ? "ml-2" : ""} />
      )}
    </>
  );

  // Si quieres enlace real, pásale href (evita usar "#")
  if (Comp === "a" || href) {
    return (
      <a href={href || ""} onClick={onClick} className={classes} aria-disabled={disabled} title={title} {...rest}>
        {Content}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={classes}
      disabled={disabled}
      title={title}
      {...rest}
    >
      {Content}
    </button>
  );
}
