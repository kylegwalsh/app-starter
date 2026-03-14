import { ArrowLeftIcon } from 'lucide-react';
import { Link } from 'react-router';

import {
  ManagementRestrictedHeader,
  OrganizationPluginDisabledCard,
} from './organization-plugin-disabled';

type OrganizationDetailPluginDisabledProps = {
  backTo?: string;
};

export const OrganizationDetailPluginDisabled = ({
  backTo = '/dashboard/organizations',
}: OrganizationDetailPluginDisabledProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to={backTo}
          className="text-muted-foreground hover:text-foreground inline-flex items-center justify-center transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <ManagementRestrictedHeader title="Organization" />
      </div>

      <OrganizationPluginDisabledCard />
    </div>
  );
};
