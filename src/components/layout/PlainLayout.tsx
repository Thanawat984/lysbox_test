import React from "react";

export type PlainLayoutProps = React.PropsWithChildren<{ className?: string }>

const PlainLayout: React.FC<PlainLayoutProps> = ({ className, children }) => {
  return (
    <div className={className ?? "min-h-dvh bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"}>
      {children}
    </div>
  );
};

export default PlainLayout;
