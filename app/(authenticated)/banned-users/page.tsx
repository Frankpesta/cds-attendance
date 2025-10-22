"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getSessionAction } from "@/app/actions/session";
import { unbanUserAction } from "@/app/actions/auth";
import { Shield, UserX, UserCheck, AlertTriangle } from "lucide-react";

interface BannedUser {
  _id: string;
  name: string;
  email: string;
  state_code: string;
  registered_ip: string | undefined;
  role: string;
  created_at: number;
}

export default function BannedUsersPage() {
  const { push } = useToast();
  const [session, setSession] = useState<any | null | undefined>(undefined);
  const [isUnbanning, setIsUnbanning] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const s = await getSessionAction();
      setSession(s);
    })();
  }, []);

  const bannedUsers = useQuery(api.auth.getBannedUsers, {});

  const handleUnban = async (userId: string) => {
    setIsUnbanning(userId);
    try {
      const result = await unbanUserAction(userId);
      
      if (!result.ok) {
        throw new Error(result.error || 'Failed to unban user');
      }

      push({ variant: "success", title: "User Unbanned", description: "The user has been successfully unbanned and can now log in." });
    } catch (error) {
      push({ variant: "error", title: "Error", description: error instanceof Error ? error.message : "Failed to unban user" });
    } finally {
      setIsUnbanning(null);
    }
  };

  if (session === undefined) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (session?.user?.role !== "super_admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600">Only Super Admins can access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Banned Corps Members</h1>
        <p className="text-muted-foreground">Manage corps members who have been temporarily locked due to IP address mismatches</p>
      </div>

      {bannedUsers && bannedUsers.length > 0 ? (
        <div className="grid gap-4">
          {bannedUsers.map((user: BannedUser) => (
            <Card key={user._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <UserX className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{user.name}</h3>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleUnban(user._id)}
                    disabled={isUnbanning === user._id}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isUnbanning === user._id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Unbanning...
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 mr-2" />
                        Unban User
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">State Code:</span>
                    <p className="text-gray-600">{user.state_code}</p>
                  </div>
                  <div>
                    <span className="font-medium">Role:</span>
                    <p className="text-gray-600 capitalize">{user.role.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <span className="font-medium">Registered IP:</span>
                    <p className="text-gray-600 font-mono">{user.registered_ip}</p>
                  </div>
                  <div>
                    <span className="font-medium">Account Created:</span>
                    <p className="text-gray-600">{new Date(user.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <UserCheck className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Banned Users</h3>
            <p className="text-gray-600">All users are currently able to access the system.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold">IP Security Information</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p>
              <strong>How IP Security Works:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>When a corps member logs in for the first time, their IP address is registered</li>
              <li>If they try to log in from a different IP address, they are automatically banned</li>
              <li>Admins and Super Admins can log in from any device without restrictions</li>
              <li>Only Super Admins can unban corps members who have been locked due to IP mismatches</li>
              <li>This helps prevent unauthorized access to corps member accounts</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
