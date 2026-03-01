import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-muted/40 py-12 px-4 flex items-center justify-center">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 p-4">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
          </div>
          <h1 className="text-xl font-bold">Verification Failed</h1>
          <p className="text-muted-foreground">
            This clearance certificate could not be verified. The link may be invalid or the certificate may have been forged.
          </p>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/">
            <Button variant="secondary">Return Home</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
