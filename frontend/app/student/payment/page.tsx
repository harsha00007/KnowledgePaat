"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { CreditCard, ArrowLeft } from 'lucide-react';

export default function PaymentPage() {
  const router = useRouter();

  return (
    <StudentLayout>
      <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[60vh]">
        <Card className="p-10 border-gray-200 text-center flex flex-col items-center w-full shadow-sm">
          
          <div className="h-20 w-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
            <CreditCard className="w-10 h-10" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Upgrade to Premium</h1>
          <p className="text-gray-600 mb-8 max-w-md">
            Payment integration will be implemented in the next phase. Our full payment gateway (Razorpay) is currently under development.
          </p>
          
          <Button 
            variant="outline" 
            onClick={() => router.push('/student/subscription')}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
          </Button>

        </Card>
      </div>
    </StudentLayout>
  );
}
