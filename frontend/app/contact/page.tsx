import React from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Mail, MessageSquare } from 'lucide-react';

export default function ContactPage() {
  return (
    <PublicLayout>
      <section className="bg-gray-50 py-16 border-b border-gray-200">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Contact Us</h1>
          <p className="mt-4 text-lg text-gray-600">
            Have a question or feedback? We'd love to hear from you.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white flex-1">
        <div className="container mx-auto px-4 max-w-xl">
          <Card className="p-8 shadow-lg border-gray-100">
            <form className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <Input 
                    label="First Name" 
                    placeholder="John" 
                  />
                </div>
                <div>
                  <Input 
                    label="Last Name" 
                    placeholder="Doe" 
                  />
                </div>
              </div>
              
              <div>
                <Input 
                  label="Email Address" 
                  type="email" 
                  placeholder="john@example.com" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea 
                  className="w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[150px] resize-y"
                  placeholder="How can we help you?"
                ></textarea>
              </div>

              <Button type="button" className="w-full h-11 text-base flex justify-center items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Send Message
              </Button>
            </form>

            <div className="mt-10 pt-8 border-t border-gray-100 flex flex-col items-center justify-center text-center">
              <Mail className="w-6 h-6 text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-900">Email us directly</p>
              <a href="mailto:support@careerlaunch.com" className="text-blue-600 text-sm hover:underline mt-1">
                support@careerlaunch.com
              </a>
            </div>
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
}
