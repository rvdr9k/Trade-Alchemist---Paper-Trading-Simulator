import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">Forgot Password</CardTitle>
        <CardDescription>
          Enter your email to receive a password reset link.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="m@example.com" />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button className="w-full">Send Reset Link</Button>
        <div className="text-center text-sm">
          <Link href="/login" className="text-muted-foreground hover:text-primary">
            Back to Sign In
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
