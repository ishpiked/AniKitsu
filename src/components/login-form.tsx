"use client";

import { useActionState } from "react";
import { ShieldAlert } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/lib/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="size-5" /> Dev access
        </CardTitle>
        <CardDescription>
          Restricted area. Sign in with the operator passphrase.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="passphrase">Passphrase</Label>
            <Input
              id="passphrase"
              name="passphrase"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
            />
          </div>
          {state?.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Interim gate until a real identity provider and backend admin API
            exist. Never share or commit the passphrase.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

