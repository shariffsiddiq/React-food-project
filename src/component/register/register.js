import React, { useState, useEffect, useRef } from "react";
import * as faceapi from "face-api.js";
import { useHistory } from "react-router-dom";
import "../register/register.css";

function Register() {
  const [faceData, setFaceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [isReadyToRegister, setIsReadyToRegister] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);

  const videoRef = useRef();
  const canvasRef = useRef();
  const detectionRef = useRef(null);
  const history = useHistory();

  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
      setLoading(false);
    };
    loadModels();
  }, []);

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;

    videoRef.current.onloadedmetadata = () => {
      videoRef.current.play();
      runFaceDetection();
    };
  };

  const runFaceDetection = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resized = faceapi.resizeResults(detections, displaySize);
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);

      faceapi.draw.drawDetections(canvas, resized);
      faceapi.draw.drawFaceLandmarks(canvas, resized);

      if (detections.length === 1) {
        document.getElementById("overlay").style.border = "3px solid green";
        setIsFaceDetected(true);
        detectionRef.current = detections[0];
      } else {
        document.getElementById("overlay").style.border = "3px solid red";
        setIsFaceDetected(false);
        detectionRef.current = null;
      }
    }, 300);
  };

  const handleCaptureClick = () => {
    if (detectionRef.current && faceData.length < 3) {
      const descriptor = Array.from(detectionRef.current.descriptor);
      const updatedData = [...faceData, descriptor];
      setFaceData(updatedData);

      const newCount = updatedData.length;
      setCaptureCount(newCount);
      setProgress((newCount / 3) * 100);

      if (newCount === 3) {
        setIsReadyToRegister(true);
        alert("All 3 face captures completed! You may now register.");
      } else {
        alert(`Face ${newCount}/3 captured.`);
      }
    } else if (!isFaceDetected) {
      alert("No face detected. Please align your face properly.");
    } else {
      alert("You've already captured 3 face images.");
    }
  };

  const handleRegister = () => {
    if (faceData.length === 3) {
      localStorage.setItem("faceData", JSON.stringify(faceData));
      alert("Registration complete! Redirecting to login...");
      history.push("/login");
    } else {
      alert("Please capture all 3 face images first.");
    }
  };

  return (
    <div className="register-body">
      <div className="register-main">
        <h1>Register with Face</h1>

        {loading ? (
          <div className="spinner"></div>
        ) : (
          <>
            <div className="camera-wrapper">
              <video
                ref={videoRef}
                autoPlay
                muted
                width="360"
                height="270"
              />
              <canvas
                ref={canvasRef}
                width="360"
                height="270"
                id="overlay"
              ></canvas>
            </div>

            <button onClick={startCamera}>Start Camera</button>

            <button onClick={handleCaptureClick} disabled={!isFaceDetected}>
              Capture Face
            </button>

            <button
              onClick={handleRegister}
              disabled={!isReadyToRegister}
              style={{ backgroundColor: isReadyToRegister ? "green" : "gray" }}
            >
              Register Face
            </button>

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
