'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/design/components/ui';
import { cn } from '@repo/design/lib/utils';
import { Check, Minus } from 'lucide-react';
import { Fragment } from 'react';

/** A plan for the table */
type Plan = {
  /** The key of the plan (used to access the feature in the PlanFeature) */
  key: string;
  /** The name of the plan (displayed in the table) */
  name: string;
};

/** Creates a feature type where each plan key becomes a required boolean property */
type PlanFeature<T extends readonly Plan[]> = {
  /** The name of the feature (displayed in the table) */
  name: string;
} & {
  /** Each plan key becomes a required boolean property */
  [K in T[number]['key']]: boolean;
};

/** A feature group for a plan with strongly typed plan keys */
type PlanFeatureGroup<T extends readonly Plan[]> = {
  /** The type of feature (displayed in the table) */
  type: string;
  /** The features for the plan */
  features: PlanFeature<T>[];
};

type Props<T extends readonly Plan[]> = {
  /** The plans to show at the top of the table */
  plans: T;
  /** The feature groups to show in the table */
  featureGroups: PlanFeatureGroup<T>[];
  /** The class name to apply to the desktop table */
  tableClassName?: string;
  /** The class name to apply to the mobile breakdown */
  mobileClassName?: string;
  /** Whether to show the mobile breakdown */
  showMobileBreakdown?: boolean;
};

/** A responsive plan comparison table component */
export const PlanTable = <T extends readonly Plan[]>({
  plans,
  featureGroups,
  tableClassName,
  mobileClassName,
  showMobileBreakdown = true,
}: Props<T>) => {
  // Calculate column width based on number of plans
  const planColumnWidth = Math.floor((2 / plans.length) * 12); // Distribute remaining space after feature column
  const featureColumnWidth = 12 - planColumnWidth * plans.length;

  return (
    <>
      {/* Desktop Table */}
      <Table className={cn('hidden lg:table', tableClassName)}>
        <TableHeader>
          <TableRow className="bg-muted hover:bg-muted">
            <TableHead className={cn('font-medium text-primary', `w-${featureColumnWidth}/12`)}>
              Plans
            </TableHead>
            {plans.map((plan) => (
              <TableHead
                className={`text-primary text-center text-lg font-medium w-${planColumnWidth}/12`}
                key={plan.key}
              >
                {plan.name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {featureGroups.map((featureGroup) => (
            <Fragment key={featureGroup.type}>
              {/* Feature Group Header */}
              <TableRow className="bg-muted/50">
                <TableCell className="font-bold" colSpan={plans.length + 1}>
                  {featureGroup.type}
                </TableCell>
              </TableRow>
              {/* Features */}
              {featureGroup.features.map((feature) => (
                <TableRow className="text-muted-foreground" key={feature.name}>
                  <TableCell>{feature.name}</TableCell>
                  {plans.map((plan) => (
                    <TableCell key={plan.key}>
                      <div className="mx-auto w-min">
                        {feature[plan.key as keyof typeof feature] ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <Minus className="h-5 w-5" />
                        )}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>

      {/* Mobile Sections */}
      {showMobileBreakdown && (
        <div className={cn('space-y-12 lg:hidden', mobileClassName)}>
          {plans.map((plan) => (
            <section key={plan.key}>
              <div className="mb-4">
                <h4 className="text-xl font-medium">{plan.name}</h4>
              </div>
              <Table>
                <TableBody>
                  {featureGroups.map((featureGroup) => (
                    <Fragment key={featureGroup.type}>
                      {/* Feature Group Header */}
                      <TableRow className="bg-muted hover:bg-muted">
                        <TableCell className="text-primary w-10/12 font-bold" colSpan={2}>
                          {featureGroup.type}
                        </TableCell>
                      </TableRow>
                      {/* Features */}
                      {featureGroup.features.map((feature) => (
                        <TableRow className="text-muted-foreground" key={feature.name}>
                          <TableCell className="w-11/12">{feature.name}</TableCell>
                          <TableCell className="text-right">
                            {feature[plan.key as keyof typeof feature] ? (
                              <Check className="h-5 w-5" />
                            ) : (
                              <Minus className="h-5 w-5" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </section>
          ))}
        </div>
      )}
    </>
  );
};
