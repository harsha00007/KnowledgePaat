import React from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Card } from '@/components/Card';
import { Users, Code, Brain, Building } from 'lucide-react';
import Link from 'next/link';

export default function InterviewPreparationPage() {
  return (
    <PublicLayout>
      <section className="bg-gray-50 py-16 border-b border-gray-200">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Interview Preparation</h1>
          <p className="mt-4 text-lg text-gray-600">
            Master your upcoming interviews with our curated collection of questions and answers. Choose a category below to get started.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white flex-1">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CategoryCard 
              title="HR Interview"
              description="Common behavioral and cultural fit questions with tips on how to answer."
              icon={<Users className="w-8 h-8 text-blue-600" />}
              href="#"
            />
            <CategoryCard 
              title="Technical Interview"
              description="Core computer science concepts, programming fundamentals, and system design."
              icon={<Code className="w-8 h-8 text-blue-600" />}
              href="#"
            />
            <CategoryCard 
              title="Aptitude & Reasoning"
              description="Quantitative aptitude, logical reasoning, and verbal ability exercises."
              icon={<Brain className="w-8 h-8 text-blue-600" />}
              href="#"
            />
            <CategoryCard 
              title="Company-wise Questions"
              description="Specific interview experiences and previously asked questions by top tech companies."
              icon={<Building className="w-8 h-8 text-blue-600" />}
              href="#"
            />
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

function CategoryCard({ title, description, icon, href }: { title: string, description: string, icon: React.ReactNode, href: string }) {
  return (
    <Link href={href} className="group">
      <Card className="h-full p-8 hover:shadow-lg transition-all hover:-translate-y-1 border-gray-100 hover:border-blue-100">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">{title}</h3>
        <p className="text-gray-600 leading-relaxed">
          {description}
        </p>
        <div className="mt-6 flex items-center text-blue-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
          Start Preparing →
        </div>
      </Card>
    </Link>
  );
}
