import { Separator } from '@repo/design';
import * as React from 'react';

type Props = Component & {
  title: string;
  description: string;
};

/** The standard layout for the settings pages */
export const SettingsLayout = ({ children, title, description }: Props) => {
  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      <Separator />

      {children}
    </div>
  );
};
