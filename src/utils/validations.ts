import { z } from 'zod';

export const signupSchema = z.object({
  gym_name: z.string().min(1, 'Organization Name is required.'),
  owner_name: z.string().min(2, 'Full Name must be at least 2 characters.'),
  owner_phone: z.string()
    .min(1, 'Phone Number is required.')
    .regex(/^[6-9]\d{9}$/, 'Phone number must start with 6-9 and be exactly 10 digits.'),
  owner_email: z.string()
    .min(1, 'Work Email is required.')
    .email('Please enter a valid email address.'),
  password: z.string()
    .min(1, 'Password is required.')
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Z]/, 'Password must include at least one uppercase letter.')
    .regex(/[a-z]/, 'Password must include at least one lowercase letter.')
    .regex(/[0-9]/, 'Password must include at least one number.')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must include at least one special character (!@#$%^&* etc).')
});

export type SignupFormData = z.infer<typeof signupSchema>;

export const onboardingSchema = z.object({
  subdomain: z.string()
    .min(3, 'Web address must be at least 3 characters.')
    .regex(/^[a-z0-9-]+$/, 'Web address can only contain lowercase letters, numbers, and dashes.'),
  address: z.string().min(1, 'Gym Address is required.'),
  timings: z.string().min(1, 'Operating Timings are required.')
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;
