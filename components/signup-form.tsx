"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";

const signupSchema = z
  .object({
    fullName: z.string().min(2, "Please enter your full name."),
    email: z.string().email("Enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password is too long."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

type SignupValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: SignupValues) => {
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password,
      );
      await updateProfile(userCredential.user, {
        displayName: values.fullName,
      });
      router.push("/dashboard");
    } catch {
      setAuthError("Could not create account. Please try again.");
    }
  };

  return (
    <main className="ta-shell ta-auth-page">
      <Card>
        <div className="ta-brand-row">
          <div className="ta-logo">
            <img src="/logo-dark.png" alt="TradeAlchemist Logo" />
          </div>
          <div>
            <h1 className="ta-title">Create account</h1>
            <p className="ta-subtitle">Join TradeAlchemist and Start Paper Trading</p>
          </div>
        </div>

        <form className="ta-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <label className="ta-label" htmlFor="fullName">
            Full name
          </label>
          <Input id="fullName" type="text" placeholder="Alex Trader" {...register("fullName")} />
          {errors.fullName ? <p className="ta-error">{errors.fullName.message}</p> : null}

          <label className="ta-label" htmlFor="email">
            Email
          </label>
          <Input id="email" type="email" placeholder="you@tradealchemist.app" {...register("email")} />
          {errors.email ? <p className="ta-error">{errors.email.message}</p> : null}

          <label className="ta-label" htmlFor="password">
            Password
          </label>
          <Input id="password" type="password" placeholder="Create a password" {...register("password")} />
          {errors.password ? <p className="ta-error">{errors.password.message}</p> : null}

          <label className="ta-label" htmlFor="confirmPassword">
            Confirm password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Re-enter your password"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword ? <p className="ta-error">{errors.confirmPassword.message}</p> : null}

          <Button type="submit" isLoading={isSubmitting}>
            Create account
          </Button>
          {authError ? <p className="ta-error">{authError}</p> : null}
        </form>

        <p className="ta-link-row">
          Already have an account? <Link href="/">Sign in</Link>
        </p>
      </Card>
    </main>
  );
}
