import os

pages = {
    'app/page.tsx': ('PublicLayout', 'Home'),
    'app/jobs/page.tsx': ('PublicLayout', 'Jobs'),
    'app/pricing/page.tsx': ('PublicLayout', 'Pricing'),
    'app/about/page.tsx': ('PublicLayout', 'About'),
    'app/contact/page.tsx': ('PublicLayout', 'Contact'),
    'app/login/page.tsx': ('PublicLayout', 'Login'),
    'app/register/page.tsx': ('PublicLayout', 'Register'),
    'app/student/page.tsx': ('StudentLayout', 'Student Dashboard'),
    'app/interview-preparation/page.tsx': ('StudentLayout', 'Interview Preparation'),
    'app/notes/page.tsx': ('StudentLayout', 'Notes'),
    'app/admin/page.tsx': ('AdminLayout', 'Admin Dashboard')
}

for path, (layout, title) in pages.items():
    if not os.path.exists(os.path.dirname(path)):
        os.makedirs(os.path.dirname(path))
    with open(path, 'w') as f:
        f.write(f'''import {{ {layout} }} from "@/layouts/{layout}";

export default function Page() {{
  return (
    <{layout}>
      <div className="flex flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold">{title} - Coming Soon</h1>
      </div>
    </{layout}>
  );
}}
''')
print('Done writing pages.')
