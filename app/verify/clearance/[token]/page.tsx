import { getClearanceVerificationByToken } from "@/lib/repositories/clearance";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function VerifyClearancePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const verification = await getClearanceVerificationByToken(token);

  if (!verification) {
    notFound();
  }

  const user = await prisma.user.findUnique({
    where: { id: verification.user_id },
    select: { name: true, email: true, state_code: true, cds_group_id: true },
  });

  if (!user) {
    notFound();
  }

  const cdsGroup = user.cds_group_id
    ? await prisma.cdsGroup.findUnique({
        where: { id: user.cds_group_id },
        select: { name: true },
      })
    : null;
  const groupName = cdsGroup?.name ?? "Not Assigned";

  return (
    <div className="min-h-screen bg-muted/40 py-12 px-4">
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold">Clearance Slip Verified</h1>
            <p className="text-muted-foreground">
              This slip is authentic and was issued by the CDS Attendance Management System.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Name</span>
                <span>{user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">State Code</span>
                <span className="font-mono">{user.state_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">CDS Group</span>
                <span>{groupName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Period</span>
                <span>{monthNames[verification.month - 1]} {verification.year}</span>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Verification ID: {token.slice(0, 16)}...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
