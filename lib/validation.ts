export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation
export const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (password.length < 8) {
    return { isValid: false, message: "Password must be at least 8 characters long" };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, message: "Password must contain at least one lowercase letter" };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, message: "Password must contain at least one uppercase letter" };
  }
  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, message: "Password must contain at least one number" };
  }
  return { isValid: true };
};

// State code validation (NYSC format)
export const validateStateCode = (stateCode: string): { isValid: boolean; message?: string } => {
  const stateCodeRegex = /^[A-Z]{2}\/\d{2}[A-Z]\/\d{4}$/;
  if (!stateCodeRegex.test(stateCode)) {
    return { 
      isValid: false, 
      message: "State code must be in format: XX/YYZ/1234 (e.g., AK/24A/1234)" 
    };
  }
  return { isValid: true };
};

// Name validation
export const validateName = (name: string): { isValid: boolean; message?: string } => {
  if (name.trim().length < 2) {
    return { isValid: false, message: "Name must be at least 2 characters long" };
  }
  if (name.trim().length > 100) {
    return { isValid: false, message: "Name must be less than 100 characters" };
  }
  if (!/^[a-zA-Z\s'-]+$/.test(name.trim())) {
    return { isValid: false, message: "Name can only contain letters, spaces, hyphens, and apostrophes" };
  }
  return { isValid: true };
};

// Phone number validation (Nigerian format)
export const validatePhone = (phone: string): { isValid: boolean; message?: string } => {
  const phoneRegex = /^(\+234|0)?[789][01]\d{8}$/;
  if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
    return { 
      isValid: false, 
      message: "Please enter a valid Nigerian phone number (e.g., 08012345678)" 
    };
  }
  return { isValid: true };
};

// Coordinate validation
export const validateCoordinates = (lat: number, lng: number): { isValid: boolean; message?: string } => {
  if (lat < -90 || lat > 90) {
    return { isValid: false, message: "Latitude must be between -90 and 90" };
  }
  if (lng < -180 || lng > 180) {
    return { isValid: false, message: "Longitude must be between -180 and 180" };
  }
  return { isValid: true };
};

// Meeting duration validation
export const validateMeetingDuration = (duration: number): { isValid: boolean; message?: string } => {
  if (duration < 30) {
    return { isValid: false, message: "Meeting duration must be at least 30 minutes" };
  }
  if (duration > 180) {
    return { isValid: false, message: "Meeting duration must not exceed 180 minutes" };
  }
  return { isValid: true };
};

// Generic required field validation
export const validateRequired = (value: string, fieldName: string): { isValid: boolean; message?: string } => {
  if (!value || value.trim().length === 0) {
    return { isValid: false, message: `${fieldName} is required` };
  }
  return { isValid: true };
};

// Validate user creation form
export const validateUserForm = (formData: {
  name: string;
  email: string;
  state_code: string;
  role: string;
  password: string;
  confirmPassword: string;
  address?: string;
  ppa?: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  // Name validation
  const nameValidation = validateName(formData.name);
  if (!nameValidation.isValid) {
    errors.push({ field: "name", message: nameValidation.message! });
  }

  // Email validation
  if (!validateEmail(formData.email)) {
    errors.push({ field: "email", message: "Please enter a valid email address" });
  }

  // State code validation
  const stateCodeValidation = validateStateCode(formData.state_code);
  if (!stateCodeValidation.isValid) {
    errors.push({ field: "state_code", message: stateCodeValidation.message! });
  }

  // Role validation
  const roleValidation = validateRequired(formData.role, "Role");
  if (!roleValidation.isValid) {
    errors.push({ field: "role", message: roleValidation.message! });
  }

  // Password validation
  const passwordValidation = validatePassword(formData.password);
  if (!passwordValidation.isValid) {
    errors.push({ field: "password", message: passwordValidation.message! });
  }

  // Confirm password validation
  if (formData.password !== formData.confirmPassword) {
    errors.push({ field: "confirmPassword", message: "Passwords do not match" });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validate CDS group form
export const validateGroupForm = (formData: {
  name: string;
  meeting_days: string[];
  meeting_time: string;
  meeting_duration: number;
  venue_name: string;
  venue_lat: string;
  venue_lng: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  // Name validation
  const nameValidation = validateRequired(formData.name, "Group name");
  if (!nameValidation.isValid) {
    errors.push({ field: "name", message: nameValidation.message! });
  }

  // Meeting days validation
  if (formData.meeting_days.length === 0) {
    errors.push({ field: "meeting_days", message: "Please select at least one meeting day" });
  }

  // Venue name validation
  const venueValidation = validateRequired(formData.venue_name, "Venue name");
  if (!venueValidation.isValid) {
    errors.push({ field: "venue_name", message: venueValidation.message! });
  }

  // Meeting duration validation
  const durationValidation = validateMeetingDuration(formData.meeting_duration);
  if (!durationValidation.isValid) {
    errors.push({ field: "meeting_duration", message: durationValidation.message! });
  }

  // Coordinates validation
  const lat = parseFloat(formData.venue_lat);
  const lng = parseFloat(formData.venue_lng);
  
  if (isNaN(lat) || isNaN(lng)) {
    errors.push({ field: "venue_coordinates", message: "Please enter valid coordinates" });
  } else {
    const coordValidation = validateCoordinates(lat, lng);
    if (!coordValidation.isValid) {
      errors.push({ field: "venue_coordinates", message: coordValidation.message! });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validate onboarding form
export const validateOnboardingForm = (formData: {
  name: string;
  email: string;
  state_code: string;
  cds_group_id: string;
  address?: string;
  ppa?: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  // Name validation
  const nameValidation = validateName(formData.name);
  if (!nameValidation.isValid) {
    errors.push({ field: "name", message: nameValidation.message! });
  }

  // Email validation
  if (!validateEmail(formData.email)) {
    errors.push({ field: "email", message: "Please enter a valid email address" });
  }

  // State code validation
  const stateCodeValidation = validateStateCode(formData.state_code);
  if (!stateCodeValidation.isValid) {
    errors.push({ field: "state_code", message: stateCodeValidation.message! });
  }

  // CDS group validation
  const groupValidation = validateRequired(formData.cds_group_id, "CDS Group");
  if (!groupValidation.isValid) {
    errors.push({ field: "cds_group_id", message: groupValidation.message! });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
