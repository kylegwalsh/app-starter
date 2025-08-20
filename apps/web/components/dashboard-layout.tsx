import { Separator } from '@repo/design';
import * as React from 'react';

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

/** Generic dashboard page layout with a title and description */
export function DashboardLayout({ title, description, actions, children }: Props) {
  return (
    <div className="w-full space-y-6 px-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>

      <Separator />

      {children}
    </div>
  );
}
