import React from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/Button';
import { Card, CardContent } from '@/components/Card';
import { 
  BriefcaseIcon, 
  BookOpenIcon, 
  FileTextIcon, 
  LayoutDashboardIcon,
  CheckCircle2,
  ChevronDown,
  ArrowRight
} from 'lucide-react';

export default function Home() {
  return (
    <PublicLayout>
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-white pt-24 pb-32">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="container relative mx-auto px-4 text-center">
          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-gray-900 sm:text-7xl">
            Get Your First Job <span className="text-blue-600">Faster</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl">
            Find verified fresher jobs, prepare for interviews, access study notes, and apply through official company links.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto flex gap-2 items-center">
                Get Started <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/jobs">
              <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white">
                Explore Jobs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. FEATURES SECTION */}
      <section className="bg-gray-50 py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Everything you need to succeed</h2>
            <p className="mt-4 text-lg text-gray-600">All the tools and resources designed specifically for freshers.</p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard 
              icon={<BriefcaseIcon className="h-6 w-6 text-blue-600" />}
              title="Verified Jobs"
              description="Apply only to verified fresher openings with direct company links."
            />
            <FeatureCard 
              icon={<BookOpenIcon className="h-6 w-6 text-blue-600" />}
              title="Interview Preparation"
              description="Curated HR, technical, and company-specific interview questions."
            />
            <FeatureCard 
              icon={<FileTextIcon className="h-6 w-6 text-blue-600" />}
              title="Study Notes"
              description="Access high-quality study notes for aptitude and programming."
            />
            <FeatureCard 
              icon={<LayoutDashboardIcon className="h-6 w-6 text-blue-600" />}
              title="Simple Dashboard"
              description="Track your applications and preparation progress easily."
            />
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS SECTION */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">How It Works</h2>
            <p className="mt-4 text-lg text-gray-600">Your journey from registration to your first job.</p>
          </div>
          
          <div className="max-w-4xl mx-auto relative">
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-blue-100 -translate-x-1/2 hidden md:block"></div>
            
            <Step number="1" title="Register" desc="Create your free account in seconds." isLeft={true} />
            <Step number="2" title="Complete Profile" desc="Add your education and skills details." isLeft={false} />
            <Step number="3" title="Upload Resume" desc="Upload your latest professional resume." isLeft={true} />
            <Step number="4" title="Browse Jobs" desc="Find verified jobs matching your profile." isLeft={false} />
            <Step number="5" title="Apply via Official Link" desc="Direct apply on the company's official portal." isLeft={true} isLast={true} />
          </div>
        </div>
      </section>

      {/* 4. PRICING PREVIEW */}
      <section className="bg-gray-50 py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Simple, transparent pricing</h2>
            <p className="mt-4 text-lg text-gray-600">Start for free, upgrade when you need more power.</p>
          </div>
          
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="relative p-8">
              <h3 className="text-2xl font-bold text-gray-900">Free Plan</h3>
              <div className="mt-4 text-4xl font-extrabold text-gray-900">₹0</div>
              <p className="mt-2 text-gray-500">Perfect for getting started.</p>
              <ul className="mt-8 space-y-4">
                <PricingFeature text="Browse Jobs" />
                <PricingFeature text="Basic Interview Prep" />
                <PricingFeature text="Limited Study Notes" />
              </ul>
              <div className="mt-8">
                <Link href="/register">
                  <Button variant="outline" className="w-full">Get Started</Button>
                </Link>
              </div>
            </Card>
            
            <Card className="relative p-8 border-blue-600 shadow-xl ring-1 ring-blue-600">
              <div className="absolute top-0 right-6 -translate-y-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">Recommended</div>
              <h3 className="text-2xl font-bold text-gray-900">Premium Plan</h3>
              <div className="mt-4 text-4xl font-extrabold text-gray-900">₹999<span className="text-lg font-normal text-gray-500">/year</span></div>
              <p className="mt-2 text-gray-500">Everything you need to get hired.</p>
              <ul className="mt-8 space-y-4">
                <PricingFeature text="Everything in Free" />
                <PricingFeature text="Advanced Interview Prep" />
                <PricingFeature text="All Premium Study Notes" />
                <PricingFeature text="Priority Job Alerts" />
              </ul>
              <div className="mt-8">
                <Link href="/pricing">
                  <Button variant="primary" className="w-full">View Details</Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 5. FAQ PREVIEW */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            <FaqItem 
              question="Are the jobs listed verified?" 
              answer="Yes, every job posted on CareerLaunch is manually verified and links directly to the official company application page." 
            />
            <FaqItem 
              question="Is the interview preparation material free?" 
              answer="We offer a comprehensive selection of free interview prep materials. For deeper insights and company-specific questions, we recommend the Premium plan." 
            />
            <FaqItem 
              question="Can I upgrade my plan later?" 
              answer="Absolutely! You can start with the Free plan and upgrade to Premium anytime from your dashboard." 
            />
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="border-none shadow-sm bg-white p-6 transition-shadow hover:shadow-md">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
        {icon}
      </div>
      <h3 className="mb-2 font-semibold text-gray-900 text-xl">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </Card>
  );
}

function Step({ number, title, desc, isLeft, isLast = false }: { number: string, title: string, desc: string, isLeft: boolean, isLast?: boolean }) {
  return (
    <div className={`relative flex flex-col md:flex-row items-center justify-between mb-12 ${isLast ? '' : 'md:mb-24'}`}>
      {/* Mobile Number Indicator */}
      <div className="md:hidden flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xl mb-4 z-10">
        {number}
      </div>
      
      <div className={`w-full md:w-[45%] ${isLeft ? 'md:text-right' : 'md:order-3 md:text-left'} text-center`}>
        <div className={`bg-white p-6 rounded-xl border border-gray-100 shadow-sm transition-transform hover:-translate-y-1 ${isLeft ? 'md:mr-8' : 'md:ml-8'}`}>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <p className="mt-2 text-gray-600">{desc}</p>
        </div>
      </div>
      
      {/* Desktop Number Indicator */}
      <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-blue-600 text-white font-bold text-xl z-10 shadow-md">
        {number}
      </div>
      
      <div className="w-full md:w-[45%] hidden md:block"></div>
    </div>
  );
}

function PricingFeature({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3 text-gray-600">
      <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
      <span>{text}</span>
    </li>
  );
}

function FaqItem({ question, answer }: { question: string, answer: string }) {
  return (
    <details className="group rounded-lg border border-gray-200 bg-white p-6 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer items-center justify-between gap-1.5 text-gray-900">
        <h2 className="font-semibold">{question}</h2>
        <ChevronDown className="h-5 w-5 shrink-0 transition duration-300 group-open:-rotate-180 text-gray-500" />
      </summary>
      <p className="mt-4 leading-relaxed text-gray-600">{answer}</p>
    </details>
  );
}
