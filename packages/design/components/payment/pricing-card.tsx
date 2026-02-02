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
} from '@repo/design/components/ui';
import { cn } from '@repo/design/lib/utils';
import { Check } from 'lucide-react';
import type { FC } from 'react';

type Props = {
  plan: string;
  description?: string;
  price: number;
  period?: string;
  currency?: string;
  features: string[];
  onClick: (...args: unknown[]) => void;
  buttonText?: string;
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
  banner?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  popular?: boolean;
  disabled?: boolean;
  className?: string;
};

/** A pricing card showing plan details */
export const PricingCard: FC<Props> = ({
  plan,
  description,
  price,
  currency = '$',
  features,
  onClick,
  buttonText = 'Sign up',
  buttonVariant = 'outline',
  banner,
  popular = false,
  disabled = false,
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
          <span className="font-bold text-5xl">{priceDisplay}</span>
          <span className="text-muted-foreground">/mo</span>
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
        <Button
          className="w-full"
          disabled={disabled}
          onClick={onClick}
          variant={popular ? 'default' : buttonVariant}
        >
          {buttonText}
        </Button>
      </CardFooter>
    </Card>
  );
};
