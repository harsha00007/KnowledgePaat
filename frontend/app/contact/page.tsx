"use client";

import React, { useState } from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Mail, MessageSquare, MapPin, CheckCircle2, Send } from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <PublicLayout>
      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-[var(--color-border)] pt-14 pb-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] px-3.5 py-1 text-xs font-semibold text-[var(--color-brand-600)] mb-4">
            Support & Inquiries
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
            Get in touch with the GradZenX team
          </h1>
          <p className="mt-4 text-base text-[var(--color-text-secondary)] leading-relaxed max-w-xl mx-auto">
            Have questions about student subscriptions, job verification, or interview materials? We're here to help.
          </p>
        </div>
      </section>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
      <section className="bg-[var(--color-bg-subtle)] py-16 flex-1">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Contact info column */}
            <div className="space-y-6">
              <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] flex items-center justify-center">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Email Support</h3>
                    <p className="text-xs text-[var(--color-text-secondary)]">Response within 24 hours</p>
                  </div>
                </div>
                <a href="mailto:support@gradzenx.com" className="text-sm font-semibold text-[var(--color-brand-600)] hover:underline">
                  support@gradzenx.com
                </a>
              </div>

              <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)] flex items-center justify-center">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Student Helpdesk</h3>
                    <p className="text-xs text-[var(--color-text-secondary)]">Mon - Fri, 9am - 6pm IST</p>
                  </div>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  For subscription or account verification help, please mention your registered email ID.
                </p>
              </div>
            </div>

            {/* Form column */}
            <div className="lg:col-span-2">
              <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-8 sm:p-10 shadow-[var(--shadow-sm)]">
                {submitted ? (
                  <div className="text-center py-10 animate-in fade-in">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-600)] mb-4">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Message Received!</h3>
                    <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto mb-6">
                      Thank you for reaching out. Our support team will review your message and reply to <strong>{formData.email || 'your email'}</strong> shortly.
                    </p>
                    <Button variant="outline" onClick={() => setSubmitted(false)}>
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="First Name"
                        placeholder="John"
                        required
                        value={formData.firstName}
                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                      />
                      <Input
                        label="Last Name"
                        placeholder="Doe"
                        required
                        value={formData.lastName}
                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                      />
                    </div>

                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="john@example.com"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />

                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                        Your Message
                      </label>
                      <textarea
                        rows={4}
                        required
                        placeholder="How can we help you?"
                        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] shadow-[var(--shadow-xs)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-[var(--color-brand-500)] transition-colors resize-y"
                        value={formData.message}
                        onChange={e => setFormData({ ...formData, message: e.target.value })}
                      />
                    </div>

                    <div className="pt-2">
                      <Button type="submit" className="w-full sm:w-auto px-8" isLoading={isSubmitting}>
                        <Send className="mr-2 h-4 w-4" /> Send Message
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
