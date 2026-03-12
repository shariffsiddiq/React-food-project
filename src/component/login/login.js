import React, { useState, useEffect, useRef } from "react";
import * as faceapi from "face-api.js";
import { useHistory } from "react-router-dom";
import "../login/login.css";

function Login() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Initializing...");
  const [progress, setProgress] = useState(0);
  const [loginSuccess, setLoginSuccess] = useState(false);

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
      setMessage("Click 'Start Camera' to begin login.");
    };
    loadModels();
  }, []);

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
    videoRef.current.play();
    detectFace();
    setMessage("Align your face for scanning.");
  };

  const detectFace = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resized = faceapi.resizeResults(detections, displaySize);
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, resized);
      faceapi.draw.drawFaceLandmarks(canvas, resized);

      if (detections.length === 1) {
        detectionRef.current = detections[0];
        document.getElementById("overlay").style.border = "3px solid green";
        setMessage("✅ Face detected. Click 'Login with Face'.");
      } else {
        detectionRef.current = null;
        document.getElementById("overlay").style.border = "3px solid red";
        setMessage("❌ No face detected. Please align properly.");
      }
    }, 300);
  };

  const handleLogin = async () => {
    if (!detectionRef.current) {
      setMessage("❌ No face detected.");
      return;
    }

    const storedData = JSON.parse(localStorage.getItem("faceData"));
    if (!storedData) {
      setMessage("❗ No face data found. Please register first.");
      return;
    }

    const matchThreshold = 0.5;
    const descriptor = detectionRef.current.descriptor;

    const distances = storedData.map((saved) =>
      faceapi.euclideanDistance(descriptor, saved)
    );

    const bestMatch = Math.min(...distances);

    if (bestMatch < matchThreshold) {
      setLoginSuccess(true);
      setProgress(100);
      setMessage("🎉 Login successful! Redirecting...");
      setTimeout(() => history.push("/home"), 2000);
    } else {
      setMessage("❌ Face does not match. Try again.");
      setProgress(0);
    }
  };

  return (
    <div className="login-body">
      <div className="login-main">
        <h1>Login with Face</h1>
        <p style={{ color: "orange" }}>{message}</p>

        {loading ? (
          <div className="spinner"></div>
        ) : (
          <>
            <div className="camera-wrapper">
              <video ref={videoRef} width="360" height="270" muted />
              <canvas ref={canvasRef} width="360" height="270" id="overlay" />
            </div>

            <button onClick={startCamera}>Start Camera</button>
            <button onClick={handleLogin}>Login with Face</button>

            <div className="progress-bar-wrapper">
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              {loginSuccess && <p>✅ Login Complete</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;
