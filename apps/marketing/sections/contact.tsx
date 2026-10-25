import { ContactForm } from '@/components';

/** The "get in touch" section (link to it with `#contact`) */
export const Contact = () => (
  <section id="contact" className="border-border/50 bg-surface border-t py-20">
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold sm:text-4xl">Get in touch</h2>
        <p className="text-muted-foreground mt-4 text-lg">
          Tell us a bit about what you're looking for and we'll get back to you.
        </p>
      </div>

      <div className="border-border/60 bg-card mx-auto mt-10 max-w-lg rounded-2xl border p-6 shadow-sm sm:p-8">
        <ContactForm />
      </div>
    </div>
  </section>
);
