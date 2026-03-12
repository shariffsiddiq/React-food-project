import React, { useState, useEffect, useRef } from "react";
import * as faceapi from "face-api.js";
import { useHistory } from "react-router-dom";
import "../register/register.css";

function Register() {
  // State management
  const [faceData, setFaceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [captureCount, setCaptureCount] = useState(0);
  const [message, setMessage] = useState("Initializing...");
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState(0);
  const [isReadyToRegister, setIsReadyToRegister] = useState(false);
  const [isSecondCaptureEnabled, setIsSecondCaptureEnabled] = useState(false);
  const [isThirdCaptureEnabled, setIsThirdCaptureEnabled] = useState(false);

  // Challenge states
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [currentInstruction, setCurrentInstruction] = useState("");

  // References
  const videoRef = useRef();
  const canvasRef = useRef();
  const detectionRef = useRef(null);
  const detectionInterval = useRef(null);
  const previousLandmarks = useRef(null);
  const headNoddedDown = useRef(false);
  const stableFrames = useRef(0);
  const challengeTimer = useRef(null);

  const history = useHistory();

  // List of challenges (Only 1st challenge now)
  const challenges = [
    {
      id: 1,
      instruction: "Turn your head slightly left and then right",
      verifier: "headMovementSideways"
    }
  ];

  // Load face-api models on component mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Load required models for face detection and recognition
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
        await faceapi.nets.faceExpressionNet.loadFromUri("/models");

        setLoading(false);
        setMessage("Click 'Start Camera' to begin face registration");
      } catch (error) {
        console.error("Error loading models:", error);
        setMessage("Failed to load face detection models. Please refresh and try again.");
      }
    };

    loadModels();

    // Clean up on component unmount
    return () => {
      if (detectionInterval.current) {
        clearInterval(detectionInterval.current);
      }
      if (challengeTimer.current) {
        clearTimeout(challengeTimer.current);
      }

      // Stop camera stream if active
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // Set challenge when currentChallenge state changes
  useEffect(() => {
    if (currentChallenge < challenges.length) {
      setCurrentInstruction(challenges[currentChallenge].instruction);
      setChallengeCompleted(false);
      stableFrames.current = 0;
      headNoddedDown.current = false;
    }
  }, [currentChallenge]);

  // Start the camera and face detection process
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 360,
          height: 270,
          facingMode: "user"
        }
      });

      videoRef.current.srcObject = stream;
      videoRef.current.play();

      // Initialize face detection process
      startFaceDetection();
      setMessage(`${challenges[currentChallenge].instruction} to verify you're a real person`);
    } catch (error) {
      console.error("Error accessing camera:", error);
      setMessage("Camera access denied. Please allow camera permission and try again.");
    }
  };

  // Start continuous face detection
  const startFaceDetection = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    // Clear any existing interval
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
    }

    // Set new detection interval
    detectionInterval.current = setInterval(async () => {
      // Only process if video is playing
      if (video.paused || video.ended || !video.srcObject) return;

      try {
        // Detect faces with landmarks and expressions
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
          .withFaceLandmarks()
          .withFaceDescriptors()
          .withFaceExpressions();

        // Resize results to match display size
        const resized = faceapi.resizeResults(detections, displaySize);

        // Clear previous drawings
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

        // Draw face detections and landmarks
        faceapi.draw.drawDetections(canvas, resized);
        faceapi.draw.drawFaceLandmarks(canvas, resized);

        // Handle face detection status
        if (detections.length === 1) {
          const currentDetection = detections[0];
          const landmarks = currentDetection.landmarks.positions;

          // Store current detection for later use
          detectionRef.current = currentDetection;
          setIsFaceDetected(true);

          // Visual indicator for face detection
          document.getElementById("overlay").style.border = "3px solid green";

          // Perform anti-spoofing checks based on current challenge
          if (!challengeCompleted) {
            const currentVerifier = challenges[currentChallenge].verifier;

            // Check appropriate anti-spoofing method based on challenge
            switch (currentVerifier) {
              case "headMovementSideways":
                processHeadMovementSideways(landmarks);
                break;
              default:
                break;
            }

            // Store current landmarks for next comparison (for eyebrow movement)
            previousLandmarks.current = landmarks;
          }
        } else {
          // No face or multiple faces detected
          setIsFaceDetected(false);
          detectionRef.current = null;
          document.getElementById("overlay").style.border = "3px solid red";

          if (detections.length > 1) {
            setMessage("⚠️ Multiple faces detected. Please ensure only one person is in view.");
          } else {
            setMessage("Looking for your face...");
          }

          // Reset stability counters
          stableFrames.current = 0;
        }
      } catch (error) {
        console.error("Face detection error:", error);
      }
    }, 150); // Run detection every 150ms for performance
  };

  // Process head movement for sideways challenge
  const processHeadMovementSideways = (landmarks) => {
    const nose = landmarks[30];
    const leftEye = landmarks[36];
    const rightEye = landmarks[45];
    const faceWidth = rightEye.x - leftEye.x;

    // Calculate face angle using nose position relative to eyes
    const centerX = (leftEye.x + rightEye.x) / 2;
    const offsetRatio = (nose.x - centerX) / faceWidth;

    // Detect head turning
    if (offsetRatio < -0.15) {
      headNoddedDown.current = true;
      setMessage("✓ Left turn detected. Now turn right.");
    } else if (offsetRatio > 0.15) {
      // Both left and right turns detected - challenge completed
      if (headNoddedDown.current) {
        stableFrames.current += 1;

        if (stableFrames.current >= 5) {
          setChallengeCompleted(true);
          setMessage("✅ Head movement verified! Ready to capture.");
        }
      } else {
        setMessage("Turn your head left first, then right");
      }
    }
  };


  // Handle face capture
  const handleCaptureClick = () => {
    if (!isFaceDetected || !detectionRef.current) {
      setMessage("❌ No face detected. Please try again when your face is clearly visible.");
      return;
    }

    if (!challengeCompleted) {
      setMessage(`⚠️ Please complete the current challenge: ${currentInstruction}`);
      return;
    }



    if (faceData.length >= 3) {
      setMessage("✅ You have already captured 3 faces.");
      return;
    }

    // Store face descriptor for registration
    const descriptor = Array.from(detectionRef.current.descriptor);
    const updatedData = [...faceData, descriptor];
    setFaceData(updatedData);

    // Update progress indicators
    const newCount = updatedData.length;
    setCaptureCount(newCount);
    setProgress((newCount / 3) * 100);
    setChallengeCompleted(false); // Reset for the next challenge


    stableFrames.current = 0; // Reset stability counter
    headNoddedDown.current = false; // Reset



    // Move to next challenge or finish registration
    if (newCount < 3) {
      setCurrentChallenge(currentChallenge => currentChallenge + 1);
      setMessage(`✔️ Face ${newCount}/3 captured. Next challenge: ${challenges[currentChallenge].instruction}`);
    } else {
      setIsReadyToRegister(true);
      setMessage("🎉 All 3 live faces captured! Click 'Register Face' to complete.");
    }
  };

  // Complete registration and store face data
  const handleRegister = () => {
    if (faceData.length === 3) {
      try {
        // Store face data in localStorage (in a real app, send to a secure server)
        localStorage.setItem("faceData", JSON.stringify(faceData));
        alert("✅ Face registration successful! Redirecting to login...");
        history.push("/login");
      } catch (error) {
        console.error("Registration error:", error);
        alert("❌ Registration failed. Please try again.");
      }
    } else {
      alert("❗ Please capture all 3 live face images first.");
    }
  };

  const getCaptureButtonText = () => {
    if (captureCount === 0) {
      return "Capture Face 1/3";
    } else if (captureCount === 1) {
      return "Capture Face 2/3";
    } else if (captureCount === 2) {
      return "Capture Face 3/3";
    } else {
      return "Capture Face";
    }
  };

  const isCaptureButtonEnabled = () => {
    if (!isFaceDetected || !challengeCompleted) {
      return false;
    }
    return true;
  };

  return (
    <div className="register-body">
      <div className="register-main">
        <h1>Secure Face Registration</h1>

        {/* Status message to guide user */}
        <p className="status-message" style={{ color: "orange" }}>{message}</p>

        {loading ? (
          <div className="spinner"></div>
        ) : (
          <>
            <div className="camera-wrapper">
              <video ref={videoRef} width="360" height="270" muted />
              <canvas ref={canvasRef} width="360" height="270" id="overlay" />

              {/* Challenge indicator overlay */}
              {isFaceDetected && !challengeCompleted && (
                <div className="challenge-indicator">
                  <span>Challenge {currentChallenge + 1}/3: {currentInstruction}</span>
                </div>
              )}
            </div>

            {/* Camera control button */}
            <button
              onClick={startCamera}
              disabled={videoRef.current && videoRef.current.srcObject}
              className="control-button"
            >
              Start Camera
            </button>

            {/* Capture button */}
            <button
              onClick={handleCaptureClick}
              disabled={!isCaptureButtonEnabled()}
              className="capture-button"
              style={{
                backgroundColor: isCaptureButtonEnabled() ? "#4CAF50" : "#ccc"
              }}
            >
              {getCaptureButtonText()}
            </button>

            {/* Register button - enabled only when all faces are captured */}
            <button
              onClick={handleRegister}
              disabled={!isReadyToRegister}
              className="register-button"
              style={{
                backgroundColor: isReadyToRegister ? "#2196F3" : "#ccc",
              }}
            >
              Register Face
            </button>

            {/* Progress indicator */}
            <div className="progress-bar-wrapper">
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p>{captureCount}/3 faces captured</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Register;
