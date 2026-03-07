"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password is too long."),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginValues) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      router.push("/dashboard");
    } catch {
      setAuthError("Could not sign in. Check your credentials and try again.");
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
            <h1 className="ta-title">TradeAlchemist</h1>
            <p className="ta-subtitle">Stock Market Simulator | Paper Trader</p>
          </div>
        </div>

        <form className="ta-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <label className="ta-label" htmlFor="email">
            Email
          </label>
          <Input id="email" type="email" placeholder="you@tradealchemist.app" {...register("email")} />
          {errors.email ? <p className="ta-error">{errors.email.message}</p> : null}

          <label className="ta-label" htmlFor="password">
            Password
          </label>
          <Input id="password" type="password" placeholder="Enter your password" {...register("password")} />
          {errors.password ? <p className="ta-error">{errors.password.message}</p> : null}

          <Button type="submit" isLoading={isSubmitting}>
            Sign in
          </Button>
          {authError ? <p className="ta-error">{authError}</p> : null}
        </form>
        <p className="ta-link-row">
          New to TradeAlchemist? <Link href="/signup">Sign up</Link>
        </p>
      </Card>
    </main>
  );
}
