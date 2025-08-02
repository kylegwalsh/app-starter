import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Separator,
  SidebarTrigger,
} from '@repo/design';
import Link from 'next/link';
import { Fragment } from 'react';

type Props = {
  breadcrumbs: {
    label: string;
    href?: string;
  }[];
};

/** The standard header used in our application */
export const Header: FC<Props> = ({ breadcrumbs, children }) => (
  <header className="flex h-16 shrink-0 items-center justify-between gap-2">
    <div className="flex items-center gap-2 px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((page, index) => (
            <Fragment key={page.label}>
              {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
              <BreadcrumbItem className="hidden md:block">
                {page.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={page.href}>{page.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{page.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
    {children}
  </header>
);
