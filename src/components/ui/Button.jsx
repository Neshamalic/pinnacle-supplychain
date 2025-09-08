// src/components/ui/Button.jsx
import React from 'react';
import Icon from '@/components/AppIcon';

export default function Button({
  type = 'button',           // ✅ por defecto NUNCA submit
  variant = 'default',
  size = 'md',
  iconName,
  iconPosition = 'left',
  className = '',
  onClick,
  children,
  ...rest
}) {
  // clases mínimas; mantén las tuyas si ya las tienes
  const base =
    'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors focus:outline-none';
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-border bg-background hover:bg-muted',
    ghost: 'hover:bg-muted',
  };
  const sizes = { sm: 'px-2 py-1 text-sm', md: 'px-3 py-2', lg: 'px-4 py-2.5 text-base' };

  const classes = [
    base,
    variants[variant] ?? variants.default,
    sizes[size] ?? sizes.md,
    className,
  ].join(' ');

  // ✅ blindaje: si NO es submit, evitamos navegación/submit
  const handleClick = (e) => {
    try {
      if (type !== 'submit') e.preventDefault?.();
      e.stopPropagation?.();
    } catch {}
    onClick?.(e);
  };

  return (
    <button
      type={type}           // ✅ se fija aquí; ningún spread lo pisa
      className={classes}
      onClick={handleClick}
      {...rest}             // ✅ el spread va DESPUÉS, pero ya fijamos type arriba
    >
      {iconName && iconPosition === 'left' && <Icon name={iconName} size={16} />}
      <span>{children}</span>
      {iconName && iconPosition === 'right' && <Icon name={iconName} size={16} />}
    </button>
  );
}
