"use client";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, QrCode } from "lucide-react";
import jsQR from "jsqr";
import { submitAttendanceAction } from "@/app/actions/attendance";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/utils";

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const router = useRouter();
  const { push } = useToast();

  const startCamera = async () => {
    try {
      setCameraLoading(true);
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 640 },
            height: { ideal: 480 },
            advanced: [{ frameRate: { ideal: 30 } }],
          },
        });
        console.log("Using environment-facing camera");
      } catch (backCameraError) {
        console.warn("Back camera failed, trying any camera:", backCameraError);
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });
        console.log("Using default camera");
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("Video playing successfully");
              setCameraActive(true);
              setCameraLoading(false);
            })
            .catch((playError) => {
              console.error("Error playing video:", playError);
              push({
                variant: "error",
                title: "Camera Error",
                description: "Could not start video playback. Please check permissions.",
              });
              setCameraLoading(false);
              stopCamera();
            });
        }

        videoRef.current.onerror = (e) => {
          console.error("Video error:", e);
          push({ variant: "error", title: "Camera Error", description: "Video stream error. Please try again." });
          setCameraLoading(false);
          stopCamera();
        };
      } else {
        console.error("Video ref is null");
        push({ variant: "error", title: "Camera Error", description: "Unable to access video element. Refresh the page." });
        setCameraLoading(false);
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (err) {
      console.error("Camera error:", err);
      setCameraLoading(false);
      let errorMessage = "Camera access denied. Please try again.";
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        errorMessage = "Camera permission denied. Please grant access in browser settings and refresh.";
      }
      push({ variant: "error", title: "Camera Error", description: errorMessage });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  const captureFrame = (): string | null => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (context && video.videoWidth > 0 && video.videoHeight > 0) {
        let width = video.videoWidth;
        let height = video.videoHeight;
        const maxDim = 640;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.floor(width * scale);
          height = Math.floor(height * scale);
        }
        canvas.width = width;
        canvas.height = height;
        context.drawImage(video, 0, 0, width, height);

        const imageData = context.getImageData(0, 0, width, height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });
        if (code) {
          return code.data;
        }
      }
    }
    return null;
  };

  const submitToken = async (token: string): Promise<boolean> => {
    if (!token.trim()) {
      push({ variant: "error", title: "Invalid QR", description: "Please capture a readable QR code." });
      return false;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("token", token);
      const res = await submitAttendanceAction(formData);

      if (!res.ok) {
        throw new Error(res.error || "Failed to record attendance");
      }

      stopCamera();
      push({
        variant: "success",
        title: "Attendance Recorded",
        description: "Redirecting to dashboard...",
      });
      router.push("/dashboard");

      return true;
    } catch (e) {
      const errorMessage = extractErrorMessage(e, "Unknown error");
      const displayMessage = errorMessage.includes("already marked")
        ? "You've already marked attendance today."
        : errorMessage;
      push({
        variant: "error",
        title: "Scan Failed",
        description: displayMessage,
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScanClick = () => {
    if (!cameraActive) {
      push({
        variant: "error",
        title: "Camera Inactive",
        description: "Start the camera before capturing a QR code.",
      });
      return;
    }

    const captured = captureFrame();
    if (captured) {
      submitToken(captured);
    } else {
      push({
        variant: "error",
        title: "No QR Detected",
        description: "Center the QR code in the frame and try again.",
      });
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scan Attendance</h1>
          <p className="text-gray-600 mt-1">Mark attendance by manually capturing QR codes</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                <h2 className="text-xl font-semibold">QR Code Scanner</h2>
              </div>
              <p className="text-sm text-gray-600">Use your camera to manually capture QR codes</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Always render video element (hidden when inactive) so ref is available */}
              <div className={cameraActive ? "relative" : "hidden"}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover rounded-lg border-2 border-gray-200"
                  style={{ backgroundColor: "#000" }}
                />
                {cameraActive && (
                  <>
                    <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
                      <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-blue-500"></div>
                      <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-blue-500"></div>
                      <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-blue-500"></div>
                      <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-blue-500"></div>
                    </div>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-white px-3 py-1 rounded text-sm">
                      Position QR code within frame, then tap "Capture & Scan"
                    </div>
                  </>
                )}
              </div>
              
              {!cameraActive && (
                <div className="text-center py-8">
                  {cameraLoading ? (
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  ) : (
                    <Camera className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  )}
                  <h3 className="text-lg font-semibold mb-2">
                    {cameraLoading ? "Starting Camera..." : "Start Camera"}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {cameraLoading ? "Please allow camera access when prompted" : "Tap to activate your camera for manual QR capture"}
                  </p>

                  <Button
                    onClick={startCamera}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                    disabled={isSubmitting || cameraLoading}
                  >
                    <Camera className="w-4 h-4 mr-2 inline" />
                    {cameraLoading ? "Starting..." : "Start Camera"}
                  </Button>

                  {cameraLoading && (
                    <div className="text-xs text-gray-500 mt-4 space-y-1">
                      <p>• Check if camera permission was granted</p>
                      <p>• Ensure camera is not being used by another app</p>
                      <p>• Try refreshing the page if stuck</p>
                    </div>
                  )}
                </div>
              )}
              {cameraActive && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      onClick={handleScanClick}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center"
                      disabled={isSubmitting}
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      {isSubmitting ? "Scanning..." : "Capture & Scan"}
                    </Button>
                    <Button
                      onClick={stopCamera}
                      className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-gray-700"
                      disabled={isSubmitting}
                    >
                      Stop
                    </Button>
                  </div>

                  {isSubmitting && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-center gap-2 text-blue-800">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm font-medium">Processing attendance...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">How to Mark Attendance</h3>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <h4 className="font-medium mb-1">Start Camera</h4>
                  <p className="text-sm text-gray-600">Allow access and position the QR in view.</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600 font-bold">2</span>
                  </div>
                  <h4 className="font-medium mb-1">Capture & Scan</h4>
                  <p className="text-sm text-gray-600">Tap "Capture & Scan" to read the QR.</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600 font-bold">3</span>
                  </div>
                  <h4 className="font-medium mb-1">Auto Redirect</h4>
                  <p className="text-sm text-gray-600">Successful scans toast and head to the dashboard.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}