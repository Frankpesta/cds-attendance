"use client";
import { useRef, useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, QrCode, Smartphone, AlertCircle, CheckCircle, MapPin } from "lucide-react";
import jsQR  from "jsqr";

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanningIntervalRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      setCameraLoading(true);
      setError(null);
      
      // Get location first
      getLocation();
      
      // Try with back camera first, fallback to any camera
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
      } catch (backCameraError) {
        console.log("Back camera failed, trying any camera:", backCameraError);
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: true 
        });
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready and play
        videoRef.current.onloadedmetadata = async () => {
          try {
            if (videoRef.current) {
              await videoRef.current.play();
              console.log("Video playing successfully");
              setCameraActive(true);
              setCameraLoading(false);
              
              // Start scanning after a short delay to ensure video is rendering
              setTimeout(() => {
                startScanning();
              }, 500);
            }
          } catch (playError) {
            console.error("Error playing video:", playError);
            setError("Could not start video playback");
            setCameraLoading(false);
          }
        };
        
        videoRef.current.onerror = (e) => {
          console.error("Video error:", e);
          setCameraLoading(false);
          setError("Video stream error. Please try again.");
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      setCameraLoading(false);
      setError("Camera access denied. Please use manual entry.");
    }
  };

  const stopCamera = () => {
    // Stop scanning loop
    if (scanningIntervalRef.current) {
      cancelAnimationFrame(scanningIntervalRef.current);
      scanningIntervalRef.current = null;
    }
    
    // Stop video stream
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  const startScanning = () => {
    console.log("Starting continuous QR scan...");
    
    const scanFrame = () => {
      if (!videoRef.current || !canvasRef.current || !cameraActive) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      
      // Check if video is ready
      if (context && video.readyState === video.HAVE_ENOUGH_DATA && 
          video.videoWidth > 0 && video.videoHeight > 0) {
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Simple QR code detection simulation (replace with jsQR if available)
        // const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        // For demo purposes, we'll detect based on pixel patterns
        // In production, use: const code = jsQR(imageData.data, imageData.width, imageData.height);
        // if (code) {
        //   console.log("QR Code detected:", code.data);
        //   submitToken(code.data);
        //   return; // Stop scanning after detection
        // }


        const code = jsQR(imageData.data, imageData.width, imageData.height);
if (code) {
  console.log("QR Code detected:", code.data);
  submitToken(code.data);
  return;
}
      }
      
      // Continue scanning
      if (cameraActive && !scanning) {
        scanningIntervalRef.current = requestAnimationFrame(scanFrame);
      }
    };
    
    scanFrame();
  };

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext("2d");
      
      if (context && video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // In production: const code = jsQR(imageData.data, imageData.width, imageData.height);
        // For now, return null as jsQR is not in the demo
        // if (code) return code.data;
      }
    }
    return null;
  };

  const submitToken = async (token: string) => {
    if (!token.trim()) {
      setError("Please enter a valid token");
      return;
    }

    setScanning(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In production:
      // const formData = new FormData();
      // formData.set("token", token);
      // formData.set("latitude", location?.latitude?.toString() || "0");
      // formData.set("longitude", location?.longitude?.toString() || "0");
      // const res = await submitAttendanceAction(formData);
      
      setSuccessMessage("Your attendance has been recorded successfully");
      setManualToken("");
      
      // Stop camera after successful scan
      setTimeout(() => {
        stopCamera();
      }, 1500);
      
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setScanning(false);
    }
  };

  const handleManualSubmit = () => {
    submitToken(manualToken);
  };

  const handleScanClick = () => {
    if (!cameraActive) {
      setError("Please start the camera first");
      return;
    }
    
    const captured = captureFrame();
    if (captured) {
      submitToken(captured);
    } else {
      setError("No QR code detected. Try again or use manual entry.");
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scan Attendance</h1>
          <p className="text-gray-600 mt-1">Mark your attendance using QR code scanning or manual entry</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Camera Scanner */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                <h2 className="text-xl font-semibold">QR Code Scanner</h2>
              </div>
              <p className="text-sm text-gray-600">Use your camera to scan the QR code</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {!cameraActive ? (
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
                    {cameraLoading ? "Please allow camera access when prompted" : "Click to activate your camera for QR scanning"}
                  </p>
                  
                  {/* Location Status */}
                  <div className="mb-4 p-3 bg-gray-100 rounded-lg">
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
                  
                  <Button 
                    onClick={startCamera} 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                    disabled={scanning || cameraLoading}
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
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-64 object-cover rounded-lg border-2 border-gray-200"
                      style={{ backgroundColor: '#000' }}
                    />
                    <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
                      <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-blue-500"></div>
                      <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-blue-500"></div>
                      <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-blue-500"></div>
                      <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-blue-500"></div>
                    </div>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-white px-3 py-1 rounded text-sm">
                      Position QR code within frame
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleScanClick}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center"
                      disabled={scanning}
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      {scanning ? "Scanning..." : "Capture & Scan"}
                    </button>
                    <button
                      onClick={stopCamera}
                      className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg"
                      disabled={scanning}
                    >
                      Stop
                    </button>
                  </div>
                  
                  {scanning && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
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
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                </div>
              )}
              
              {successMessage && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="text-green-600 text-sm">{successMessage}</p>
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
              <p className="text-sm text-gray-600">Enter the token manually if camera fails</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Attendance Token</label>
                <Input
                  placeholder="Enter the token from the QR code"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  className="text-center font-mono text-lg tracking-wider"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ask the admin to read out the token if scanning fails
                </p>
              </div>
              
              <button
                onClick={handleManualSubmit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!manualToken.trim() || scanning}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {scanning ? "Processing..." : "Mark Attendance"}
              </button>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
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
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <h4 className="font-medium mb-1">Find the QR Code</h4>
                <p className="text-sm text-gray-600">Look for the QR code displayed by the admin</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <h4 className="font-medium mb-1">Scan or Enter Token</h4>
                <p className="text-sm text-gray-600">Use the camera scanner or enter the token manually</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-blue-600 font-bold">3</span>
                </div>
                <h4 className="font-medium mb-1">Confirm Attendance</h4>
                <p className="text-sm text-gray-600">Your attendance will be recorded automatically</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}