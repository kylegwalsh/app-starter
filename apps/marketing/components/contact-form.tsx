'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { config } from '@repo/config';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from '@repo/design';
import { contactSchema } from '@repo/schemas';
import { CheckCircle2Icon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { api } from '@/lib/orpc';

type ContactFormData = z.infer<typeof contactSchema.submit>;

/** The "get in touch" form, submitted directly to the backend API */
export const ContactForm = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema.submit),
    defaultValues: { name: '', email: '', company: '', message: '' },
  });

  const onSubmit = async (data: ContactFormData) => {
    setSubmitError(undefined);

    try {
      await api.contact.submit(data);
      setIsSubmitted(true);
    } catch {
      setSubmitError(
        config.app.supportEmail
          ? `Something went wrong. Please try again or email us at ${config.app.supportEmail}.`
          : 'Something went wrong. Please try again.',
      );
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center gap-3 text-center" aria-live="polite">
        <CheckCircle2Icon className="text-brand size-8" />
        <p className="font-medium">Thanks for reaching out</p>
        <p className="text-muted-foreground text-sm">
          We'll get back to you shortly at the email you provided.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company (optional)</FormLabel>
              <FormControl>
                <Input autoComplete="organization" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {submitError && <p className="text-destructive text-sm">{submitError}</p>}

        <Button
          type="submit"
          size="lg"
          loading={form.formState.isSubmitting}
          className="bg-brand text-brand-foreground hover:bg-brand/90 [&_.loading]:text-brand-foreground"
        >
          Send message
        </Button>
      </form>
    </Form>
  );
};
