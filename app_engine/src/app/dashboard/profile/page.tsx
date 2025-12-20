'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useUser, useAuth, useFirestore, useCollection } from '@/firebase';
import { updateProfile, updatePassword } from 'firebase/auth';
import {
  doc,
  writeBatch,
  query,
  collection,
  getDocs,
} from 'firebase/firestore';
import type { Portfolio, Holding, Trade } from '@/lib/types';
import { useMemo } from 'react';
import { useMemoFirebase } from '@/firebase/provider';

const usernameSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters.'),
});

const passwordSchema = z
  .object({
    newPassword: z.string().min(6, 'Password must be at least 6 characters.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export default function ProfilePage() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);

  const portfolioQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, `users/${user.uid}/portfolios`)) : null),
    [firestore, user]
  );
  const { data: portfolios } = useCollection<Portfolio>(portfolioQuery);
  const portfolio = useMemo(() => (portfolios ? portfolios[0] : null), [portfolios]);

  const usernameForm = useForm<z.infer<typeof usernameSchema>>({
    resolver: zodResolver(usernameSchema),
    defaultValues: {
      username: user?.displayName ?? '',
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onUsernameSubmit = async (values: z.infer<typeof usernameSchema>) => {
    if (!user) return;
    try {
      await updateProfile(user, { displayName: values.username });
      const userDocRef = doc(firestore, 'users', user.uid);
      await writeBatch(firestore).update(userDocRef, { username: values.username }).commit();
      toast({
        title: 'Success',
        description: 'Your username has been updated.',
      });
    } catch (error: any) {
      console.error('Error updating username:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not update username.',
      });
    }
  };

  const onPasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
    if (!user) return;
    try {
      await updatePassword(user, values.newPassword);
      toast({
        title: 'Success',
        description: 'Your password has been changed.',
      });
      passwordForm.reset();
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not change password. Please sign out and sign back in to continue.',
      });
    }
  };

  const handleResetPortfolio = async () => {
    if (!user || !portfolio) return;
    setIsResetting(true);

    try {
      const batch = writeBatch(firestore);

      // 1. Delete all holdings
      const holdingsQuery = query(collection(firestore, `users/${user.uid}/portfolios/${portfolio.id}/holdings`));
      const holdingsSnapshot = await getDocs(holdingsQuery);
      holdingsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // 2. Delete all trades
      const tradesQuery = query(collection(firestore, `users/${user.uid}/portfolios/${portfolio.id}/trades`));
      const tradesSnapshot = await getDocs(tradesQuery);
      tradesSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 3. Reset portfolio values
      const portfolioRef = doc(firestore, `users/${user.uid}/portfolios/${portfolio.id}`);
      batch.update(portfolioRef, {
        totalValue: 100000,
        availableBuyingPower: 100000,
        dailyGainLoss: 0,
        updatedAt: new Date().toISOString(),
      });
      
      await batch.commit();

      toast({
        title: 'Portfolio Reset',
        description: 'Your portfolio has been reset to its initial state.',
      });
    } catch (error: any) {
      console.error('Error resetting portfolio:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not reset your portfolio.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="grid gap-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Your Profile</h2>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Change Username</CardTitle>
            <CardDescription>Update your public display name.</CardDescription>
          </CardHeader>
          <Form {...usernameForm}>
            <form onSubmit={usernameForm.handleSubmit(onUsernameSubmit)}>
              <CardContent>
                <FormField
                  control={usernameForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit">Save Changes</Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Choose a new, strong password.
            </CardDescription>
          </CardHeader>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit">Update Password</Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Reset Portfolio</CardTitle>
            <CardDescription className="text-destructive">
              This action is irreversible. All your holdings, transaction history,
              and performance data will be permanently deleted.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isResetting}>
                  {isResetting ? 'Resetting...' : 'Reset Your Portfolio'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your portfolio data, including holdings and transaction history. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleResetPortfolio}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Yes, reset my portfolio
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
