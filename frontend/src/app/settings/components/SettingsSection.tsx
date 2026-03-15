import React from "react";

export function SettingsSection({
    title,
    description,
    icon: Icon,
    children,
    isDanger = false,
}: {
    title: string;
    description: string;
    icon?: React.ElementType;
    children: React.ReactNode;
    isDanger?: boolean;
}) {
    return (
        <div className="flex flex-col md:flex-row gap-8 py-10 border-b last:border-0 border-border/40">
            <div className="md:w-1/3 flex-shrink-0 space-y-3">
                <h2
                    className={`text-lg font-semibold flex items-center gap-2.5 ${
                        isDanger ? "text-destructive" : "text-foreground"
                    }`}
                >
                    {Icon && <Icon className="w-5 h-5 flex-shrink-0 opacity-80" />}
                    {title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed pr-4 md:max-w-xs">
                    {description}
                </p>
            </div>
            <div className="md:w-2/3">{children}</div>
        </div>
    );
}
