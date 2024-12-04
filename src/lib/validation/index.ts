import { z } from "zod";

export const SignupValidation = z.object({
  name: z.string().min(2, { message: "Too short!" }),
  username: z.string().min(2, { message: "Too short!" }),
  password: z
    .string()
    .min(8, { message: "Password must consist at least 8 characters!" }),
  email: z.string().email({ message: "Invalid email!" }),
});

export const SigninValidation = z.object({
  password: z
    .string()
    .min(8, { message: "Password must consist at least 8 characters!" }),
  email: z.string().email({ message: "Invalid email!" }),
});

export const PostValidation = z.object({
  caption: z.string().min(5).max(2200),
  location: z.string().min(2).max(100).optional().or(z.literal('')),
  tags: z.string(),
  file: z.custom<File[]>()
});
