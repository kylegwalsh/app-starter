import { BuildingIcon, ShieldAlertIcon } from 'lucide-react';

export const OrganizationPluginDisabledCard = () => {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-blue-200 bg-blue-50 p-10 text-center">
        {/* Decorative background icon */}
        <div className="absolute right-6 bottom-6 opacity-[0.07]">
          <ShieldAlertIcon className="h-32 w-32 text-blue-600" />
        </div>

        {/* Shield icon */}
        <div className="mb-5 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
            <ShieldAlertIcon className="h-10 w-10 text-blue-500" />
          </div>
        </div>

        <h2 className="text-foreground mb-3 text-xl font-bold">Organization Plugin Not Enabled</h2>
        <p className="text-muted-foreground mx-auto mb-8 max-w-md">
          The multi-tenant organization management system is currently inactive. To activate this
          protocol, update your backend configuration.
        </p>

        {/* Code snippet */}
        <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-white p-5 text-left">
          <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
            Activation Required
          </p>
          <pre className="text-sm leading-relaxed">
            <code>
              <span className="text-muted-foreground">// better-auth.config.ts</span>
              {'\n'}
              <span className="text-foreground font-semibold">plugins: [</span>
              {'\n'}
              <span className="font-semibold text-blue-500">{'  organization()'}</span>
              {'\n'}
              <span className="text-foreground font-semibold">]</span>
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
};

type ManagementRestrictedHeaderProps = {
  title: string;
  icon?: React.ReactNode;
};

export const ManagementRestrictedHeader = ({ title, icon }: ManagementRestrictedHeaderProps) => {
  return (
    <div>
      <div className="flex items-center gap-2">
        {icon ?? <BuildingIcon className="h-6 w-6 text-blue-500" />}
        <h1 className="text-foreground text-2xl font-bold">{title}</h1>
      </div>
      <p className="mt-0.5 text-xs font-semibold tracking-wider text-blue-600 uppercase">
        Management Restricted
      </p>
    </div>
  );
};
