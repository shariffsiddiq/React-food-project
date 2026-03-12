import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { useHistory } from "react-router-dom";
import "../login/login.css";

function Login() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [loading, setLoading] = useState(true);
  const [faceDetected, setFaceDetected] = useState(false);
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
      detectFace();
    };
  };

  const detectFace = () => {
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
        setFaceDetected(true);
        attemptLogin(detections[0]);
      } else {
        document.getElementById("overlay").style.border = "3px solid red";
        setFaceDetected(false);
      }
    }, 500);
  };

  const attemptLogin = async (detection) => {
    const storedData = JSON.parse(localStorage.getItem("faceData"));
    if (!storedData || storedData.length !== 3) {
      alert("No registered face data found. Please register first.");
      return;
    }

    const descriptors = storedData.map((desc) => new Float32Array(desc));
    const queryDescriptor = detection.descriptor;

    const distances = descriptors.map((d) =>
      faceapi.euclideanDistance(d, queryDescriptor)
    );

    const threshold = 0.55;
    const matched = distances.some((distance) => distance < threshold);

    if (matched) {
      alert("Login successful!");
      history.push("/home"); // Change to your actual route
    } else {
      alert("Face not recognized. Please try again.");
    }
  };

  return (
    <div className="login-body">
      <div className="login-main">
        <h1>Login with Face</h1>

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

            <p style={{ marginTop: "10px", color: faceDetected ? "green" : "red" }}>
              {faceDetected ? "Face detected" : "No face detected"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;
