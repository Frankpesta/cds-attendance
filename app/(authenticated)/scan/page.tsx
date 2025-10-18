"use client";
import { useRef, useState, useEffect } from "react";
import { submitAttendanceAction } from "@/app/actions/attendance";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Camera, QrCode, Smartphone, AlertCircle, CheckCircle, MapPin } from "lucide-react";
import jsQR from "jsqr";

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { push } = useToast();

  // Get user location
  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          setLocationError("Location access denied. Attendance may not be recorded.");
          console.error("Geolocation error:", error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    } else {
      setLocationError("Geolocation not supported by this browser.");
    }
  };

  const startCamera = async () => {
    try {
      // Get location first
      getLocation();
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment", // Use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setError(null);
        
        // Start continuous scanning
        startScanning();
      }
    } catch (err) {
      setError("Camera access denied. Please use manual entry.");
      push({ variant: "error", title: "Camera Error", description: "Unable to access camera" });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  const startScanning = () => {
    const scanFrame = () => {
      if (videoRef.current && canvasRef.current && !scanning) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const context = canvas.getContext("2d");
        
        if (context && video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0);
          
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code) {
            console.log("QR Code detected:", code.data);
            submitToken(code.data);
            return;
          }
        }
        
        // Continue scanning
        if (cameraActive) {
          requestAnimationFrame(scanFrame);
        }
      }
    };
    
    scanFrame();
  };

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext("2d");
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          return code.data;
        }
      }
    }
    return null;
  };

  const submitToken = async (token: string) => {
    if (!token.trim()) {
      push({ variant: "error", title: "Invalid Token", description: "Please enter a valid token" });
      return;
    }

    setScanning(true);
    try {
      const formData = new FormData();
      formData.set("token", token);
      formData.set("latitude", location?.latitude?.toString() || "0");
      formData.set("longitude", location?.longitude?.toString() || "0");

      const res = await submitAttendanceAction(formData);
      if (!res.ok) {
        push({ variant: "error", title: "Attendance Failed", description: res.error });
        return;
      }
      
      push({ variant: "success", title: "Attendance Marked", description: "Your attendance has been recorded successfully" });
      setManualToken("");
      
      // Stop camera after successful scan
      stopCamera();
    } catch (e: unknown) {
      push({ variant: "error", title: "Failed", description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setScanning(false);
    }
  };

  const handleManualSubmit = () => {
    submitToken(manualToken);
  };

  const handleScanClick = () => {
    const captured = captureFrame();
    if (captured) {
      // In a real implementation, you would process the captured image
      // to extract QR code data using a library like jsQR
      push({ variant: "error", title: "QR Scanning", description: "QR scanning requires additional library integration" });
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scan Attendance</h1>
        <p className="text-muted-foreground">Mark your attendance using QR code scanning or manual entry</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Camera Scanner */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              <h2 className="text-xl font-semibold">QR Code Scanner</h2>
            </div>
            <p className="text-sm text-muted-foreground">Use your camera to scan the QR code</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {!cameraActive ? (
              <div className="text-center py-8">
                <Camera className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Start Camera</h3>
                <p className="text-muted-foreground mb-4">Click to activate your camera for QR scanning</p>
                
                {/* Location Status */}
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {location ? 
                        `Location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 
                        "Location: Not available"
                      }
                    </span>
                  </div>
                  {locationError && (
                    <p className="text-xs text-red-600 mt-1">{locationError}</p>
                  )}
                </div>
                
                <Button onClick={startCamera} variant="primary" disabled={scanning}>
                  <Camera className="w-4 h-4 mr-2" />
                  {scanning ? "Scanning..." : "Start Camera"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-64 object-cover rounded-lg border"
                  />
                  <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none">
                    <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-lg"></div>
                    <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-lg"></div>
                    <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-lg"></div>
                    <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-lg"></div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleScanClick} variant="primary" className="flex-1" disabled={scanning}>
                    <QrCode className="w-4 h-4 mr-2" />
                    {scanning ? "Scanning..." : "Manual Scan"}
                  </Button>
                  <Button onClick={stopCamera} variant="secondary" disabled={scanning}>
                    Stop Camera
                  </Button>
                </div>
                
                {scanning && (
                  <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center justify-center gap-2 text-blue-800">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm font-medium">Processing attendance...</span>
                    </div>
                  </div>
                )}
                
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Entry */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              <h2 className="text-xl font-semibold">Manual Entry</h2>
        </div>
            <p className="text-sm text-muted-foreground">Enter the token manually if camera fails</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Attendance Token</label>
          <Input
                placeholder="Enter the token from the QR code"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
                className="text-center font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ask the admin to read out the token if scanning fails
              </p>
            </div>
            
            <Button 
              onClick={handleManualSubmit} 
              loading={scanning}
              className="w-full"
              disabled={!manualToken.trim()}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark Attendance
            </Button>
            
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Tips for successful attendance:</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    <li>• Ensure you're within 100m of the venue</li>
                    <li>• Scan during the meeting time window</li>
                    <li>• Use manual entry if camera doesn't work</li>
                    <li>• Contact admin if you encounter issues</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">How to Mark Attendance</h3>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-primary font-bold">1</span>
              </div>
              <h4 className="font-medium mb-1">Find the QR Code</h4>
              <p className="text-sm text-muted-foreground">Look for the QR code displayed by the admin</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-primary font-bold">2</span>
              </div>
              <h4 className="font-medium mb-1">Scan or Enter Token</h4>
              <p className="text-sm text-muted-foreground">Use the camera scanner or enter the token manually</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-primary font-bold">3</span>
              </div>
              <h4 className="font-medium mb-1">Confirm Attendance</h4>
              <p className="text-sm text-muted-foreground">Your attendance will be recorded automatically</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
  );
}