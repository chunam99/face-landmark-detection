import React, { useRef, useState, useEffect } from "react";
import "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import "@mediapipe/face_mesh";
import Webcam from "react-webcam";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import outlineFace from "./assets/outline-face.png";
import outlineFaceError from "./assets/outline-face-error.png";
import styled from "styled-components";

const inputResolution = {
  width: 1280,
  height: 920,
};

const videoConstraints = {
  width: inputResolution.width,
  height: inputResolution.height,
  facingMode: "user",
};

function App() {
  const webcamRef = useRef(null);
  const intervalRef = useRef(null);

  const [loaded, setLoaded] = useState(false);
  const [imgOutline, setImgOutline] = useState(outlineFace);
  const [imageSrc, setImageSrc] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [hasFace, setHasFace] = useState(false);
  const requestRef = useRef();

  // Hàm đếm ngược
  const startCountdown = (duration, callback) => {
    setCountdown(duration);
    const intervalId = setInterval(() => {
      setCountdown((prevCount) => {
        if (prevCount === 1) {
          clearInterval(intervalId);
          callback(); // Gọi callback khi đếm ngược kết thúc
        }
        return prevCount - 1;
      });
    }, 1000);

    // Lưu trữ reference của interval để có thể xóa nó sau này
    intervalRef.current = intervalId;
  };

  const runDetector = async (video) => {
    const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
    const detectorConfig = {
      runtime: "tfjs",
    };
    const detector = await faceLandmarksDetection.createDetector(
      model,
      detectorConfig
    );

    const detect = async (net) => {
      if (
        typeof webcamRef.current !== "undefined" &&
        webcamRef.current !== null &&
        webcamRef.current.video.readyState === 4
      ) {
        const estimationConfig = { flipHorizontal: false };
        const faces = await net.estimateFaces(video, estimationConfig);

        handleResults(faces);
        requestRef.current = requestAnimationFrame(() => detect(detector));
      }
    };

    detect(detector);
  };

  const handleResults = (faces) => {
    if (faces && faces.length > 0) {
      const firstFace = faces[0];
      if (firstFace.box) {
        const { xMin, xMax, yMin, yMax } = firstFace.box;
        if (
          typeof xMin !== "undefined" &&
          typeof xMax !== "undefined" &&
          typeof yMin !== "undefined" &&
          typeof yMax !== "undefined"
        ) {
          const isFaceWithinBounds =
            xMin >= 505.6659084949868 &&
            xMax <= 788.6429391215877 &&
            yMin >= 317.2498808362653 &&
            yMax <= 646.0243077090979;

          if (isFaceWithinBounds) {
            setImgOutline(outlineFace);
            setHasFace(true);
            // Sử dụng hàm đếm ngược với callback là captureImage
          } else if (!isFaceWithinBounds) {
            setCountdown(null);
            setHasFace(false);
            setImgOutline(outlineFaceError);
            clearInterval(intervalRef.current);
          }
        }
      }
    }
  };

  const captureImage = () => {
    console.log("capturing image");
    const imageSrc = webcamRef.current.getScreenshot();
    setImageSrc(imageSrc);
  };

  const handleVideoLoad = (videoNode) => {
    const video = videoNode.target;
    if (video.readyState === 4) {
      runDetector(video);
      setLoaded(true);
    }
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (hasFace) {
      startCountdown(5, captureImage);
    }
  }, [hasFace]);

  return (
    <div>
      {!imageSrc ? (
        <WrapperWebcam>
          <Webcam
            className="webcam"
            ref={webcamRef}
            width={inputResolution.width}
            height={inputResolution.height}
            videoConstraints={videoConstraints}
            onLoadedData={handleVideoLoad}
          />
          {countdown !== null && (
            <CountdownOverlay>{countdown}</CountdownOverlay>
          )}
          <img src={imgOutline} alt="" />
        </WrapperWebcam>
      ) : (
        <img src={imageSrc} key={"image-preview"} alt="Detected face" />
      )}
    </div>
  );
}

const WrapperWebcam = styled.div`
  position: relative;
  width: max-content;

  img {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 50%;
  }

  .webcam {
    rotation: 180deg;
  }
`;

const CountdownOverlay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 3rem;
  color: white;
`;

export default App;
