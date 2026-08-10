"use client";

import React, { useState, useEffect } from 'react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Camera, X, Plus, AlertCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type ProfileData = {
  fullName: string;
  email: string;
  mobile: string;
  dob: string;
  gender: string;
  city: string;
  state: string;
  country: string;
  collegeName: string;
  degree: string;
  branch: string;
  passingYear: string;
  cgpa: string;
  skills: string[];
  preferredRole: string;
  preferredLocation: string;
  expectedSalary: string;
  workMode: string;
};

const initialData: ProfileData = {
  fullName: '',
  email: '',
  mobile: '',
  dob: '',
  gender: '',
  city: '',
  state: '',
  country: '',
  collegeName: '',
  degree: '',
  branch: '',
  passingYear: '',
  cgpa: '',
  skills: [],
  preferredRole: '',
  preferredLocation: '',
  expectedSalary: '',
  workMode: '',
};

export default function ProfilePage() {
  const [data, setData] = useState<ProfileData>(initialData);
  const [skillInput, setSkillInput] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileData, string>>>({});
  const [completion, setCompletion] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setData(prev => ({
          ...prev,
          fullName: user.user_metadata?.full_name || '',
          email: user.email || '',
        }));
      }
    };
    fetchUser();
  }, [supabase]);

  // Calculate completion percentage
  useEffect(() => {
    const fieldsToTrack = [
      data.fullName,
      data.mobile,
      data.dob,
      data.gender,
      data.city,
      data.collegeName,
      data.degree,
      data.branch,
      data.passingYear,
      data.skills.length > 0 ? 'true' : '',
      data.preferredRole,
      data.workMode
    ];
    
    const completedFields = fieldsToTrack.filter(field => field.trim() !== '');
    const percentage = Math.round((completedFields.length / fieldsToTrack.length) * 100);
    setCompletion(percentage);
  }, [data]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name as keyof ProfileData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleAddSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    
    if (skillInput.trim() && !data.skills.includes(skillInput.trim())) {
      setData(prev => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()]
      }));
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove)
    }));
  };

  const validate = () => {
    const newErrors: Partial<Record<keyof ProfileData, string>> = {};
    if (!data.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!data.mobile.trim()) newErrors.mobile = 'Mobile Number is required';
    if (!data.collegeName.trim()) newErrors.collegeName = 'College Name is required';
    if (!data.degree.trim()) newErrors.degree = 'Degree is required';
    if (!data.passingYear.trim()) newErrors.passingYear = 'Passing Year is required';
    if (!data.preferredRole.trim()) newErrors.preferredRole = 'Preferred Job Role is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      alert("Profile updated successfully!");
    } else {
      // Scroll to top or show main error
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your personal and educational information.</p>
        </div>

        {/* PROFILE CARD */}
        <Card className="p-6 border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center text-[var(--color-brand-600)] font-bold text-3xl border-4 border-white shadow-sm shrink-0">
                {data.fullName ? data.fullName.charAt(0).toUpperCase() : 'S'}
              </div>
              <button className="absolute bottom-0 right-0 h-8 w-8 bg-white rounded-full border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:text-[var(--color-brand-600)] hover:border-[var(--color-brand-200)] shadow-sm transition-colors">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold text-slate-900">{data.fullName || 'Student Name'}</h2>
              <p className="text-sm text-slate-500 mb-4">{data.email || 'student@example.com'}</p>
              
              <div className="max-w-md">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">Profile Completion</span>
                  <span className="font-bold text-[var(--color-brand-600)]">{completion}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div 
                    className="bg-[var(--color-brand-600)] h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${completion}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Please fix the errors below before saving</h3>
            </div>
          </div>
        )}

        {/* PERSONAL INFORMATION */}
        <Card className="p-6 border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 border-b border-gray-100 pb-4">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField 
              label="Full Name *" name="fullName" value={data.fullName} onChange={handleChange} error={errors.fullName}
            />
            <InputField 
              label="Email Address" name="email" value={data.email} onChange={handleChange} disabled
            />
            <InputField 
              label="Mobile Number *" name="mobile" value={data.mobile} onChange={handleChange} error={errors.mobile}
            />
            <InputField 
              label="Date of Birth" name="dob" type="date" value={data.dob} onChange={handleChange} 
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select 
                name="gender" 
                value={data.gender} 
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <InputField label="City" name="city" value={data.city} onChange={handleChange} />
            <InputField label="State" name="state" value={data.state} onChange={handleChange} />
            <InputField label="Country" name="country" value={data.country} onChange={handleChange} />
          </div>
        </Card>

        {/* EDUCATION */}
        <Card className="p-6 border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 border-b border-gray-100 pb-4">Education</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <InputField 
                label="College Name *" name="collegeName" value={data.collegeName} onChange={handleChange} error={errors.collegeName}
              />
            </div>
            <InputField 
              label="Degree *" name="degree" value={data.degree} onChange={handleChange} error={errors.degree} placeholder="e.g. B.Tech, B.Sc"
            />
            <InputField 
              label="Branch" name="branch" value={data.branch} onChange={handleChange} placeholder="e.g. Computer Science"
            />
            <InputField 
              label="Passing Year *" name="passingYear" value={data.passingYear} onChange={handleChange} error={errors.passingYear} type="number"
            />
            <InputField 
              label="CGPA (Optional)" name="cgpa" value={data.cgpa} onChange={handleChange} type="number" step="0.01"
            />
          </div>
        </Card>

        {/* SKILLS */}
        <Card className="p-6 border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 border-b border-gray-100 pb-4">Skills</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Add Skills</label>
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
                placeholder="e.g. React, Java, Python"
                className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent"
              />
              <Button type="button" onClick={handleAddSkill} className="shrink-0">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2 min-h-[40px] p-4 bg-gray-50 rounded-lg border border-slate-200 shadow-sm border-dashed">
              {data.skills.length === 0 ? (
                <span className="text-sm text-gray-400 italic">No skills added yet.</span>
              ) : (
                data.skills.map((skill) => (
                  <div key={skill} className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium group">
                    {skill}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-blue-400 hover:text-blue-800 focus:outline-none ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* CAREER PREFERENCES */}
        <Card className="p-6 border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 border-b border-gray-100 pb-4">Career Preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField 
              label="Preferred Job Role *" name="preferredRole" value={data.preferredRole} onChange={handleChange} error={errors.preferredRole} placeholder="e.g. Frontend Developer"
            />
            <InputField 
              label="Preferred Location" name="preferredLocation" value={data.preferredLocation} onChange={handleChange}
            />
            <InputField 
              label="Expected Salary (Optional)" name="expectedSalary" value={data.expectedSalary} onChange={handleChange} placeholder="e.g. ₹6,00,000"
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Mode</label>
              <select 
                name="workMode" 
                value={data.workMode} 
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent"
              >
                <option value="">Select Mode</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>
          </div>
        </Card>

        {/* ACTIONS */}
        <div className="flex justify-end gap-4 pt-4">
          <Button variant="outline">Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save Changes</Button>
        </div>
        
      </div>
    </StudentLayout>
  );
}

// Helper component for cleaner code
function InputField({ 
  label, name, value, onChange, error, type = "text", placeholder, disabled = false, step
}: { 
  label: string, name: string, value: string, onChange: any, error?: string, type?: string, placeholder?: string, disabled?: boolean, step?: string 
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        step={step}
        className={`
          w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent transition-colors
          ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'}
          ${disabled ? 'bg-gray-100 text-slate-500 cursor-not-allowed' : ''}
        `}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
