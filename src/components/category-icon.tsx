import React from 'react';
import * as Icons from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
}

export default function CategoryIcon({ name, className }: CategoryIconProps) {
  // Dynamically resolve icon from Lucide React
  const IconComponent = (Icons as any)[name];

  if (!IconComponent) {
    return <Icons.HelpCircle className={className} />;
  }

  return <IconComponent className={className} />;
}
