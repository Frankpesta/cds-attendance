"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function SuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-xl text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold">Thank you!</h1>
          <p className="text-muted-foreground">
            Your corp member request has been submitted successfully. The CDS admin will review your request and contact you accordingly.
          </p>
        </CardHeader>
      </Card>
    </div>
  );
}
