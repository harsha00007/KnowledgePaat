"use client";

import React, { useState, useEffect } from 'react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Camera, X, Plus, AlertCircle, CheckCircle2, UserCheck, User } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useFeatureFlags } from '@/context/FeatureFlagContext';
import { FeatureComingSoon } from '@/components/FeatureComingSoon';

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
  const { isModuleEnabled } = useFeatureFlags();
  const isProfileEnabled = isModuleEnabled('student_profile');

  const [data, setData] = useState<ProfileData>(initialData);
  const [skillInput, setSkillInput] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileData, string>>>({});
  const [completion, setCompletion] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (isProfileEnabled) {
      fetchProfile();
    }
  }, [isProfileEnabled]);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setData(prev => ({
          ...prev,
          fullName: user.user_metadata?.full_name || '',
          email: user.email || '',
        }));

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setData(prev => ({
            ...prev,
            fullName: profile.full_name || prev.fullName,
            mobile: profile.phone || '',
            dob: profile.dob || '',
            gender: profile.gender || '',
            city: profile.city || '',
            state: profile.state || '',
            country: profile.country || '',
            collegeName: profile.college_name || '',
            degree: profile.degree || '',
            branch: profile.branch || '',
            passingYear: profile.passing_year ? String(profile.passing_year) : '',
            cgpa: profile.cgpa ? String(profile.cgpa) : '',
            skills: Array.isArray(profile.skills) ? profile.skills : [],
            preferredRole: profile.preferred_role || '',
            preferredLocation: profile.preferred_location || '',
            expectedSalary: profile.expected_salary || '',
            workMode: profile.work_mode || '',
          }));
        }
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  };

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

  const handleSave = async () => {
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName,
          phone: data.mobile,
          dob: data.dob || null,
          gender: data.gender || null,
          city: data.city || null,
          state: data.state || null,
          country: data.country || null,
          college_name: data.collegeName,
          degree: data.degree,
          branch: data.branch || null,
          passing_year: data.passingYear ? parseInt(data.passingYear, 10) : null,
          cgpa: data.cgpa ? parseFloat(data.cgpa) : null,
          skills: data.skills,
          preferred_role: data.preferredRole,
          preferred_location: data.preferredLocation || null,
          expected_salary: data.expectedSalary || null,
          work_mode: data.workMode || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setSaveError(err.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isProfileEnabled) {
    return (
      <StudentLayout>
        <FeatureComingSoon
          title="Student Profile Coming Soon"
          description="Your personal details, education background, skills portfolio, and job preferences are currently being prepared for rollout."
          icon={User}
          backHref="/student/dashboard"
        />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">My Profile</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 font-medium">
            Manage your personal details, education background, skills, and job preferences.
          </p>
        </div>

        {/* FEEDBACK ALERTS */}
        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-[var(--radius-lg)] flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold">Your profile has been successfully updated.</p>
          </div>
        )}

        {saveError && (
          <div className="bg-red-50 border border-red-200 text-[var(--color-error)] p-4 rounded-[var(--radius-lg)] flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-semibold">{saveError}</p>
          </div>
        )}

        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 border border-red-200 text-[var(--color-error)] p-4 rounded-[var(--radius-lg)] flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">Please fill in the required fields marked in red.</p>
            </div>
          </div>
        )}

        {/* ── PROFILE OVERVIEW CARD ─────────────────────────────────────── */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)]">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="h-20 w-20 rounded-full bg-[var(--color-brand-50)] border-2 border-[var(--color-brand-200)] flex items-center justify-center text-[var(--color-brand-600)] font-bold text-2xl shrink-0 uppercase shadow-sm">
              {data.fullName ? data.fullName.charAt(0).toUpperCase() : 'S'}
            </div>
            
            <div className="flex-1 text-center sm:text-left w-full">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{data.fullName || 'Student Name'}</h2>
              <p className="text-xs text-[var(--color-text-secondary)] mb-3">{data.email || 'student@example.com'}</p>
              
              <div className="max-w-md w-full mx-auto sm:mx-0">
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-[var(--color-text-secondary)]">Profile Completion</span>
                  <span className="text-[var(--color-brand-600)]">{completion}%</span>
                </div>
                <div className="w-full bg-[var(--color-bg-muted)] rounded-full h-2 overflow-hidden border border-[var(--color-border)]">
                  <div 
                    className="bg-[var(--color-brand-500)] h-full rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 1: PERSONAL INFORMATION ───────────────────────────── */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-primary)] mb-5 pb-3 border-b border-[var(--color-border)]">
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Full Name *" 
              name="fullName" 
              value={data.fullName} 
              onChange={handleChange} 
              error={errors.fullName} 
              placeholder="e.g. Rahul Sharma"
            />
            <Input 
              label="Email Address" 
              name="email" 
              value={data.email} 
              onChange={handleChange} 
              disabled 
            />
            <Input 
              label="Mobile Number *" 
              name="mobile" 
              value={data.mobile} 
              onChange={handleChange} 
              error={errors.mobile} 
              placeholder="e.g. +91 98765 43210"
            />
            <Input 
              label="Date of Birth" 
              name="dob" 
              type="date" 
              value={data.dob} 
              onChange={handleChange} 
            />
            
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Gender</label>
              <select 
                name="gender" 
                value={data.gender} 
                onChange={handleChange}
                className="flex h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-[var(--color-brand-500)] shadow-[var(--shadow-xs)] transition-colors"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <Input label="City" name="city" value={data.city} onChange={handleChange} placeholder="e.g. Bangalore" />
            <Input label="State" name="state" value={data.state} onChange={handleChange} placeholder="e.g. Karnataka" />
            <Input label="Country" name="country" value={data.country} onChange={handleChange} placeholder="e.g. India" />
          </div>
        </div>

        {/* ── SECTION 2: EDUCATION ──────────────────────────────────────── */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-primary)] mb-5 pb-3 border-b border-[var(--color-border)]">
            Education
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input 
                label="College / University Name *" 
                name="collegeName" 
                value={data.collegeName} 
                onChange={handleChange} 
                error={errors.collegeName} 
                placeholder="e.g. National Institute of Technology"
              />
            </div>
            <Input 
              label="Degree *" 
              name="degree" 
              value={data.degree} 
              onChange={handleChange} 
              error={errors.degree} 
              placeholder="e.g. B.Tech / B.E / B.Sc / MCA"
            />
            <Input 
              label="Branch / Specialization" 
              name="branch" 
              value={data.branch} 
              onChange={handleChange} 
              placeholder="e.g. Computer Science & Engineering"
            />
            <Input 
              label="Passing Year *" 
              name="passingYear" 
              value={data.passingYear} 
              onChange={handleChange} 
              error={errors.passingYear} 
              type="number"
              placeholder="e.g. 2026"
            />
            <Input 
              label="CGPA / Percentage (Optional)" 
              name="cgpa" 
              value={data.cgpa} 
              onChange={handleChange} 
              type="number" 
              step="0.01"
              placeholder="e.g. 8.5"
            />
          </div>
        </div>

        {/* ── SECTION 3: SKILLS ─────────────────────────────────────────── */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-primary)] mb-5 pb-3 border-b border-[var(--color-border)]">
            Skills
          </h3>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Add Key Technical & Soft Skills</label>
            <div className="flex gap-2.5 mb-4">
              <input 
                type="text" 
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
                placeholder="e.g. React, Java, Python, SQL"
                className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-[var(--color-brand-500)] shadow-[var(--shadow-xs)] transition-colors"
              />
              <Button type="button" variant="outline" onClick={handleAddSkill} className="shrink-0">
                <Plus className="w-4 h-4 mr-1" /> Add Skill
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2 min-h-[50px] p-3.5 bg-[var(--color-bg-subtle)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
              {data.skills.length === 0 ? (
                <span className="text-xs text-[var(--color-text-tertiary)] italic m-auto">No skills added yet. Type a skill and press Enter or Add.</span>
              ) : (
                data.skills.map((skill) => (
                  <span key={skill} className="inline-flex items-center gap-1 bg-white text-[var(--color-brand-700)] px-3 py-1 rounded-full text-xs font-semibold border border-[var(--color-brand-200)] shadow-xs">
                    {skill}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-[var(--color-brand-400)] hover:text-[var(--color-error)] ml-1"
                      aria-label={`Remove ${skill}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── SECTION 4: CAREER PREFERENCES ─────────────────────────────── */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-primary)] mb-5 pb-3 border-b border-[var(--color-border)]">
            Career Preferences
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Preferred Job Role *" 
              name="preferredRole" 
              value={data.preferredRole} 
              onChange={handleChange} 
              error={errors.preferredRole} 
              placeholder="e.g. Frontend Developer / Software Engineer"
            />
            <Input 
              label="Preferred Location" 
              name="preferredLocation" 
              value={data.preferredLocation} 
              onChange={handleChange} 
              placeholder="e.g. Bangalore / Remote / Hyderabad"
            />
            <Input 
              label="Expected Salary (Optional)" 
              name="expectedSalary" 
              value={data.expectedSalary} 
              onChange={handleChange} 
              placeholder="e.g. ₹6,00,000 / year"
            />
            
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Preferred Work Mode</label>
              <select 
                name="workMode" 
                value={data.workMode} 
                onChange={handleChange}
                className="flex h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-[var(--color-brand-500)] shadow-[var(--shadow-xs)] transition-colors"
              >
                <option value="">Select Mode</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="primary" onClick={handleSave} isLoading={isSaving} className="px-6">
            Save Changes
          </Button>
        </div>
        
      </div>
    </StudentLayout>
  );
}
