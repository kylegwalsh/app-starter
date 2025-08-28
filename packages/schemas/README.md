# @repo/schemas

Shared Zod schemas for validation and forms.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Usage](#usage)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

- Centralized schema definitions for inputs/forms shared across apps
- Types derived via `z.infer` for type-safe usage

## Usage

Using Zod with React Hook Form and shadcn/ui `Form`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@repo/design';
import { Input, Button } from '@repo/design';
import { signUpSchema } from '@repo/schemas';

type FormValues = z.infer<typeof signUpSchema>;

export function SignUpForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', phone: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    console.log(values.email, values.phone);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="(555) 555-5555" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Create account</Button>
      </form>
    </Form>
  );
}
```

Using the same schema as a tRPC router input:

```ts
import { initTRPC } from '@trpc/server';
import { signUpSchema } from '@repo/schemas';

export const appRouter = t.router({
  signUp: t.procedure.input(signUpSchema).mutation(async ({ input, ctx }) => {
    return { ok: true };
  }),
});

export type AppRouter = typeof appRouter;
```
