// src/pages/NotFound.jsx
import React from "react";
// ✅ Corrige imports a alias @
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <Icon name="AlertTriangle" size={56} className="text-red-500 mb-4" />
      <h1 className="text-3xl font-bold mb-2">Página no encontrada</h1>
      <p className="text-muted-foreground mb-6">
        La página que buscas no existe o fue movida.
      </p>
      <Button as="a" href="/" variant="default" iconName="Home" iconPosition="left">
        Volver al inicio
      </Button>
    </div>
  );
};

export default NotFound;
