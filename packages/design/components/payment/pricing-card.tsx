'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@repo/design/components/ui';
import { cn } from '@repo/design/lib/utils';
import { Check } from 'lucide-react';

type Props = {
  /** The name of the plan displayed as the card title */
  plan: string;
  /** Short description shown below the price */
  description?: string;
  /** Numeric price displayed on the card */
  price: number;
  /** Billing period label */
  period?: string;
  /** Currency symbol prepended to the price */
  currency?: string;
  /** List of feature strings to show */
  features: string[];
  /** Callback fired when the CTA button is clicked */
  onClick: (...args: unknown[]) => void;
  /** Label for the CTA button */
  buttonText?: string;
  /** Visual variant for the CTA button */
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
  /** Optional banner displayed above the plan title */
  banner?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  /** Highlights the card with a primary border and "Most popular" badge */
  popular?: boolean;
  /** Dims the card and disables the button (e.g. for the current plan) */
  disabled?: boolean;
  /** Whether we're still loading and should disable the button */
  loading?: boolean;
  /** Additional CSS classes for the card container */
  className?: string;
};

/** A pricing card showing plan details */
export const PricingCard: FC<Props> = ({
  plan,
  description,
  price,
  period = 'mo',
  currency = '$',
  features,
  onClick,
  buttonText = 'Sign up',
  buttonVariant = 'outline',
  banner,
  popular = false,
  disabled = false,
  loading = false,
  className,
}) => {
  const displayBanner =
    banner || (popular && { text: 'Most popular', variant: 'default' as const });

  // Format price display
  const priceDisplay = `${currency}${price}`;

  return (
    <Card
      className={cn(
        'flex flex-col',
        popular && 'border-primary',
        disabled && 'opacity-60',
        className,
      )}
    >
      <CardHeader className="pb-2 text-center">
        {displayBanner && (
          <Badge className="mb-3 w-max self-center uppercase">{displayBanner.text}</Badge>
        )}
        <CardTitle className={cn('mb-7', displayBanner && '!mb-7')}>{plan}</CardTitle>
        <div className="flex items-end justify-center gap-2">
          <span className="text-5xl font-bold">{priceDisplay}</span>
          <span className="text-muted-foreground">/{period}</span>
        </div>
      </CardHeader>

      {description && (
        <CardDescription
          className={cn(
            'text-center',
            // Responsive width matching the existing design
            'mx-auto w-11/12',
          )}
        >
          {description}
        </CardDescription>
      )}

      <CardContent className="flex-1">
        <ul className="mt-7 space-y-2.5 text-sm">
          {features.map((feature) => (
            <li className="flex space-x-2" key={feature}>
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        {loading ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Button
            className="w-full"
            disabled={disabled}
            onClick={onClick}
            variant={popular ? 'default' : buttonVariant}
          >
            {buttonText}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
