/**
 * Test script for Student Profile Validation
 */

interface ProfileValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

function validateProfile(data: {
  fullName: string;
  mobile: string;
  dob: string;
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
}): ProfileValidationResult {
  const newErrors: Record<string, string> = {};

  // 1. Full Name: Required, 2-100 characters
  const trimmedName = data.fullName.trim();
  if (!trimmedName) {
    newErrors.fullName = 'Full Name is required';
  } else if (trimmedName.length < 2) {
    newErrors.fullName = 'Full Name must be at least 2 characters';
  } else if (trimmedName.length > 100) {
    newErrors.fullName = 'Full Name cannot exceed 100 characters';
  }

  // 2. Mobile Number: Required, 7-20 chars, numeric format
  const trimmedMobile = data.mobile.trim();
  if (!trimmedMobile) {
    newErrors.mobile = 'Mobile Number is required';
  } else if (trimmedMobile.length > 20) {
    newErrors.mobile = 'Mobile Number cannot exceed 20 characters';
  } else if (/[a-zA-Z]/.test(trimmedMobile) || !/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]{6,15}$/.test(trimmedMobile)) {
    newErrors.mobile = 'Please enter a valid mobile number (e.g. +91 98765 43210)';
  }

  // 3. Date of Birth: Optional, not in future, realistic year
  if (data.dob) {
    const dobDate = new Date(data.dob);
    const today = new Date();
    if (isNaN(dobDate.getTime())) {
      newErrors.dob = 'Please enter a valid date of birth';
    } else if (dobDate > today) {
      newErrors.dob = 'Date of birth cannot be in the future';
    } else if (dobDate.getFullYear() < 1920) {
      newErrors.dob = 'Please enter a realistic year of birth';
    }
  }

  // 4. City, State, Country: Optional, max 100 chars
  if (data.city && data.city.trim().length > 100) {
    newErrors.city = 'City cannot exceed 100 characters';
  }
  if (data.state && data.state.trim().length > 100) {
    newErrors.state = 'State cannot exceed 100 characters';
  }
  if (data.country && data.country.trim().length > 100) {
    newErrors.country = 'Country cannot exceed 100 characters';
  }

  // 5. College Name: Required, max 150 chars
  const trimmedCollege = data.collegeName.trim();
  if (!trimmedCollege) {
    newErrors.collegeName = 'College Name is required';
  } else if (trimmedCollege.length > 150) {
    newErrors.collegeName = 'College Name cannot exceed 150 characters';
  }

  // 6. Degree: Required, max 100 chars
  const trimmedDegree = data.degree.trim();
  if (!trimmedDegree) {
    newErrors.degree = 'Degree is required';
  } else if (trimmedDegree.length > 100) {
    newErrors.degree = 'Degree cannot exceed 100 characters';
  }

  // 7. Branch: Optional, max 100 chars
  if (data.branch && data.branch.trim().length > 100) {
    newErrors.branch = 'Branch cannot exceed 100 characters';
  }

  // 8. Passing Year: Required, integer between 1950 and 2100 (reject negative, decimals, text)
  const trimmedPassingYear = data.passingYear.trim();
  if (!trimmedPassingYear) {
    newErrors.passingYear = 'Passing Year is required';
  } else {
    const pyNum = Number(trimmedPassingYear);
    if (isNaN(pyNum) || !/^\d+$/.test(trimmedPassingYear)) {
      newErrors.passingYear = 'Passing year must be a valid 4-digit number (e.g. 2026)';
    } else if (pyNum < 1950 || pyNum > 2100) {
      newErrors.passingYear = 'Passing year must be between 1950 and 2100';
    }
  }

  // 9. CGPA / Percentage: Optional, numeric float/decimal, between 0 and 100 (reject negative, text)
  const trimmedCgpa = data.cgpa.trim();
  if (trimmedCgpa) {
    const cgpaNum = Number(trimmedCgpa);
    if (isNaN(cgpaNum) || !/^-?\d+(\.\d+)?$/.test(trimmedCgpa)) {
      newErrors.cgpa = 'Please enter a valid numeric CGPA or Percentage (e.g. 8.5 or 85.0)';
    } else if (cgpaNum < 0) {
      newErrors.cgpa = 'CGPA / Percentage cannot be negative (minimum is 0)';
    } else if (cgpaNum > 100) {
      newErrors.cgpa = 'CGPA / Percentage cannot exceed 100';
    }
  }

  // 10. Preferred Role: Required, max 100 chars
  const trimmedRole = data.preferredRole.trim();
  if (!trimmedRole) {
    newErrors.preferredRole = 'Preferred Job Role is required';
  } else if (trimmedRole.length > 100) {
    newErrors.preferredRole = 'Preferred Job Role cannot exceed 100 characters';
  }

  // 11. Preferred Location: Optional, max 100 chars
  if (data.preferredLocation && data.preferredLocation.trim().length > 100) {
    newErrors.preferredLocation = 'Preferred Location cannot exceed 100 characters';
  }

  // 12. Expected Salary: Optional, max 50 chars
  if (data.expectedSalary && data.expectedSalary.trim().length > 50) {
    newErrors.expectedSalary = 'Expected Salary cannot exceed 50 characters';
  }

  return {
    isValid: Object.keys(newErrors).length === 0,
    errors: newErrors,
  };
}

console.log("=== RUNNING STUDENT PROFILE VALIDATION TESTS ===\n");

const baseValidData = {
  fullName: "Rahul Sharma",
  mobile: "+91 9876543210",
  dob: "2002-05-15",
  city: "Bangalore",
  state: "Karnataka",
  country: "India",
  collegeName: "National Institute of Technology",
  degree: "B.Tech Computer Science",
  branch: "CSE",
  passingYear: "2026",
  cgpa: "8.5",
  skills: ["React", "TypeScript", "Node.js"],
  preferredRole: "Frontend Developer",
  preferredLocation: "Bangalore",
  expectedSalary: "₹8,00,000 / year",
};

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string) {
  total++;
  if (condition) {
    console.log(`✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`✗ [FAIL] ${testName}`);
  }
}

// 1. Valid Baseline
const r1 = validateProfile(baseValidData);
assert(r1.isValid, "Baseline valid profile passes");

// 2. Full Name Tests
assert(!validateProfile({ ...baseValidData, fullName: "" }).isValid, "Full name required rejected");
assert(!validateProfile({ ...baseValidData, fullName: "A" }).isValid, "Full name < 2 chars rejected");
assert(validateProfile({ ...baseValidData, fullName: "A".repeat(100) }).isValid, "Full name exactly 100 chars accepted");
assert(!validateProfile({ ...baseValidData, fullName: "A".repeat(101) }).isValid, "Full name > 100 chars rejected");

// 3. Mobile Number Tests
assert(!validateProfile({ ...baseValidData, mobile: "" }).isValid, "Mobile number required rejected");
assert(!validateProfile({ ...baseValidData, mobile: "abc12345" }).isValid, "Mobile with letters rejected");
assert(validateProfile({ ...baseValidData, mobile: "+91 98765 43210" }).isValid, "Standard phone format accepted");
assert(!validateProfile({ ...baseValidData, mobile: "+123456789012345678901" }).isValid, "Mobile > 20 chars rejected");

// 4. Passing Year Integer Tests
assert(validateProfile({ ...baseValidData, passingYear: "2026" }).isValid, "Passing year 2026 accepted");
assert(!validateProfile({ ...baseValidData, passingYear: "-1" }).isValid, "Passing year -1 rejected");
assert(!validateProfile({ ...baseValidData, passingYear: "-100" }).isValid, "Passing year -100 rejected");
assert(!validateProfile({ ...baseValidData, passingYear: "abc" }).isValid, "Passing year 'abc' rejected");
assert(!validateProfile({ ...baseValidData, passingYear: "12abc" }).isValid, "Passing year '12abc' rejected");
assert(!validateProfile({ ...baseValidData, passingYear: "2026.5" }).isValid, "Passing year decimal rejected");
assert(!validateProfile({ ...baseValidData, passingYear: "1900" }).isValid, "Passing year 1900 out of range rejected");

// 5. CGPA / Percentage Validation Tests
const validCgpas = ["0", "0.0", "7", "7.5", "8.25", "10", "90", "90.5", "100", ""];
validCgpas.forEach(val => {
  assert(validateProfile({ ...baseValidData, cgpa: val }).isValid, `CGPA valid value '${val}' accepted`);
});

const invalidCgpas = ["-1", "-0.5", "-5.5", "101", "100.1", "abc", "7abc", "@#$"];
invalidCgpas.forEach(val => {
  assert(!validateProfile({ ...baseValidData, cgpa: val }).isValid, `CGPA invalid value '${val}' rejected`);
});

// 6. Text Limits on Other Fields
assert(validateProfile({ ...baseValidData, collegeName: "A".repeat(150) }).isValid, "College name exactly 150 chars accepted");
assert(!validateProfile({ ...baseValidData, collegeName: "A".repeat(151) }).isValid, "College name > 150 chars rejected");
assert(!validateProfile({ ...baseValidData, degree: "A".repeat(101) }).isValid, "Degree > 100 chars rejected");
assert(!validateProfile({ ...baseValidData, city: "A".repeat(101) }).isValid, "City > 100 chars rejected");
assert(!validateProfile({ ...baseValidData, preferredRole: "A".repeat(101) }).isValid, "Preferred Role > 100 chars rejected");
assert(!validateProfile({ ...baseValidData, expectedSalary: "A".repeat(51) }).isValid, "Expected salary > 50 chars rejected");

console.log(`\n=== SUMMARY: ${passed} / ${total} TESTS PASSED ===\n`);
