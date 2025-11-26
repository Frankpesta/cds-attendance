"use client";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import QRCode from "qrcode";
import { stopQrAction } from "@/app/actions/qr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";
import { QrCode as QrIcon, Clock, Users, Shield, RotateCcw } from "lucide-react";

export default function QrDisplay() {
  const [sessionToken, setSessionToken] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [qrSrc, setQrSrc] = useState("");
  const [rotationCount, setRotationCount] = useState(0);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const { push } = useToast();

  useEffect(() => {
    const token = document.cookie.split(";").map((s) => s.trim()).find((s) => s.startsWith("session_token="))?.split("=")[1] || "";
    setSessionToken(token);
    
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    setMeetingDate(`${y}-${m}-${d}`);
  }, []);

  const active = useQuery(api.qr.getActiveQr, meetingDate ? { meetingDate } : "skip");
  const attendanceStats = useQuery(api.dashboard.getStats, {});

  useEffect(() => {
    if (active?.token) {
      const qrOptions = {
        errorCorrectionLevel: "H" as const,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        scale: 8,
      };

      QRCode.toDataURL(active.token, qrOptions, (error: Error | null | undefined, url: string) => {
        if (error || !url) {
          console.error("QR generation error:", error);
          push({ variant: "error", title: "QR Generation Failed", description: "Failed to generate QR code" });
          return;
        }
        setQrSrc(url);
      });
    }
  }, [active?.token, push]);

  // Update rotation count and attendance count
  useEffect(() => {
    if (active) {
      setRotationCount(active.rotation || 0);
    }
    if (attendanceStats) {
      setAttendanceCount(attendanceStats.attendanceToday || 0);
    }
  }, [active, attendanceStats]);

  if (active === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">QR Code Display</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Live QR code for attendance scanning with security features</p>
      </div>

      {active ? (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* QR Code Display */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <QrIcon className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Active QR Code</h2>
              </div>
              <p className="text-sm text-muted-foreground">Scan this code to mark attendance</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center text-center">
                <div className="w-full max-w-xs sm:max-w-sm p-4 bg-white rounded-xl shadow-2xl border-4 border-primary/20">
                  {qrSrc ? (
                    <img src={qrSrc} alt="Active QR code" className="w-full h-auto" />
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" aria-hidden />
                    </div>
                  )}
                </div>

                <div className="mt-4 w-full max-w-xs sm:max-w-sm p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Shield className="w-4 h-4" />
                    <span>Secure Token • {meetingDate}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 break-all">
                    Token: {active.token.substring(0, 8)}...
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Stats */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Session Statistics</h2>
              </div>
              <p className="text-sm text-muted-foreground">Real-time session information</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Rotations</span>
                  </div>
                  <div className="text-2xl font-bold text-primary mt-1">{rotationCount}</div>
                </div>
                
                <div className="p-4 bg-green-100 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Attendance</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600 mt-1">{attendanceCount}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Session Started:</span>
                  <span className="font-medium">{meetingDate}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Token Length:</span>
                  <span className="font-medium">{active.token.length} characters</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Security Level:</span>
                  <span className="font-medium text-green-600">High</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <QrIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active QR Session</h3>
            <p className="text-muted-foreground mb-4">Start a QR session from the dashboard to display the code here.</p>
            <Link href="/dashboard">
              <Button variant="primary">
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {active && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3 justify-center">
              <Link href="/dashboard">
                <Button variant="destructive" onClick={async () => {
                  try {
                    await stopQrAction();
                    push({ variant: "success", title: "Session Stopped", description: "QR session has been stopped" });
                  } catch (e: unknown) {
                    push({ variant: "error", title: "Failed", description: e instanceof Error ? e.message : "Unknown error" });
                  }
                }}>
                  Stop Session
                </Button>
              </Link>
              <Link href="/scan">
                <Button variant="secondary">
                  Test Scanner
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}