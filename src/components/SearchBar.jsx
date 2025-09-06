// src/components/SearchBar.jsx
import React from "react";
import Input from "./ui/Input";
import Icon from "./AppIcon";

const SearchBar = ({ value, onChange, placeholder = "Search..." }) => {
  return (
    <div className="relative w-full max-w-md">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        <Icon name="Search" size={16} />
      </span>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
};

export default SearchBar;
