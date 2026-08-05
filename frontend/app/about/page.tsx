import React from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Target, Lightbulb, Rocket } from 'lucide-react';

export default function AboutPage() {
  return (
    <PublicLayout>
      <section className="bg-gray-50 py-20 border-b border-gray-200">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">About CareerLaunch</h1>
          <p className="mt-4 text-lg text-gray-600">
            Bridging the gap between talented freshers and the companies that need them.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white flex-1">
        <div className="container mx-auto px-4 max-w-4xl">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
            <div className="bg-blue-50 p-8 rounded-2xl">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center mb-6">
                <Target className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-gray-600 leading-relaxed">
                To simplify the job search process for freshers by providing a single, trusted platform with verified opportunities, eliminating the noise of fake job postings and scams.
              </p>
            </div>
            
            <div className="bg-blue-50 p-8 rounded-2xl">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center mb-6">
                <Lightbulb className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h2>
              <p className="text-gray-600 leading-relaxed">
                We envision a world where every student has equal access to quality career resources, transparent application processes, and the guidance needed to kickstart their professional journey.
              </p>
            </div>
          </div>

          <div className="prose prose-blue max-w-none">
            <div className="flex items-center gap-3 mb-6">
              <Rocket className="w-8 h-8 text-blue-600" />
              <h2 className="text-3xl font-bold text-gray-900 m-0">Why We Built It</h2>
            </div>
            <div className="text-gray-600 space-y-6 leading-relaxed text-lg">
              <p>
                Every year, millions of students graduate with dreams of landing their first job. However, the reality of the job hunt is often frustrating. Freshers are bombarded with fake job postings, consultancies demanding money, and confusing application portals.
              </p>
              <p>
                We built CareerLaunch to solve this exact problem. We realized that students don't just need a list of jobs—they need <strong>verified</strong> jobs with direct links to official company portals. They need high-quality preparation materials that are organized and easy to digest.
              </p>
              <p>
                CareerLaunch is more than just a job board. It is a comprehensive launchpad designed specifically for students and recent graduates, combining trusted opportunities with the educational resources needed to succeed in interviews.
              </p>
            </div>
          </div>

        </div>
      </section>
    </PublicLayout>
  );
}
