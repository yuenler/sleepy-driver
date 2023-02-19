import './App.css';
import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import OtherAlertSound from './otherDriverAlert.wav';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import geolib from 'geolib';
import Sound from 'react-sound';
import { useNavigate } from "react-router-dom";
import OtherDriverModal from './OtherDriverModal';
// import Button from 'react-bootstrap/Button';
// import Modal from 'react-bootstrap/Modal';



const Home = () => {
  const navigate = useNavigate();


  const userSessionId = Math.random().toString(36).substring(7);

  const webcamRef = useRef(null);
  const FACING_MODE_USER = "user";
  const FACING_MODE_ENVIRONMENT = "environment";
  const [facingMode, setFacingMode] = useState(FACING_MODE_ENVIRONMENT);
  const [otherPlayStatus, setOtherPlayStatus] = useState('STOPPED');
  const [showAlert, setShowAlert] = useState(false);


  const videoConstraints = {
    facingMode: FACING_MODE_USER,
  };

  const alertOtherDrivers = () => {
    // get user location
    navigator.geolocation.getCurrentPosition(function (position) {
      // send alert to firebase
      firebase.database().ref(`alerts/${userSessionId}`).set({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: Date.now()
      });
    });

  }

  const drowsyClassfier = (imageSrc) => {
    return 0.6;
  }

  const detectDrowsy = async (imageSrc) => {
    const drowsy = drowsyClassfier(imageSrc) > 0.5;

    if (drowsy) {

      alertOtherDrivers();
      navigate('/alert')

    }

  }


  const distance = (lat1, lon1, lat2, lon2) => {
    const distance = geolib.getDistance(
      { latitude: lat1, longitude: lon1 },
      { latitude: lat2, longitude: lon2 }
    );
    // in meters
    return distance;
  }

  const listenForAlerts = () => {
    firebase.database().ref('alerts').on('child_changed', (snapshot) => {
      const alert = snapshot.val();
      navigator.geolocation.getCurrentPosition(function (position) {
        const distanceToAlert = distance(position.coords.latitude, position.coords.longitude, alert.latitude, alert.longitude);
        if (distanceToAlert < 1000 && alert.timestamp > Date.now() - 5000) {
          setShowAlert(true);
          setOtherPlayStatus('PLAYING');
          // wait 3 seconds, then stop
          setTimeout(() => {
            setOtherPlayStatus('STOPPED');
          }, 3000);

        }
      });
    });
  }

  useEffect(() => {
    // get current user location (this is only to make sure that the browser asks for permission)
    navigator.geolocation.getCurrentPosition(function (position) {
      console.log(position);
    });

    listenForAlerts();

    // every 5 seconds, take a screenshot and classify it as drowsy or not
    const interval = setInterval(() => {
      const imageSrc = webcamRef.current.getScreenshot();
      detectDrowsy(imageSrc);
    }, 5000);


    return () => clearInterval(interval);
  }, []);


  return (
    <div className="App">
      {
        showAlert ??
        <OtherDriverModal/> 
      }
      <Sound url={OtherAlertSound} playStatus={otherPlayStatus} />
      <Webcam
        ref={webcamRef}
        style={{
          marginLeft: "auto",
          marginRight: "auto",
          left: 0,
          right: 0,
          textAlign: "center",
          zindex: 9,
          width: "100%",
        }}
        videoConstraints={{
          ...videoConstraints,
          facingMode
        }}
        mirrored={facingMode === FACING_MODE_USER}
      />

    </div>
  );
}

export default Home;