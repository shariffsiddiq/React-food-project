import React, { useState, useEffect } from "react";
import Footer from "../footer/footer";
import Header from "../header/header";
import profilePic from "../image/profile.png";
import "../profile/profilr.css";

function Profile() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    const storedProfile = JSON.parse(sessionStorage.getItem("profile"));
    if (storedProfile) {
      setName(storedProfile.name);
      setPhone(storedProfile.phone);
      setAddress(storedProfile.address);
      setProfileSaved(true);
    }
  }, []);

  const handleSaveProfile = () => {
    const profileData = {
      name,
      phone,
      address,
    };
    sessionStorage.setItem("profile", JSON.stringify(profileData));
    setProfileSaved(true);
    alert("Profile saved successfully!");
  };

  return (
    <div className="profile-bg">
      <Header />
      <div className="profile-main">
        <img src={profilePic} alt="profile" className="imge" />
        <h2>User Profile</h2>

        <label>User Name:</label>
        <input
          type="text"
          value={name}
          placeholder="Enter your name"
          onChange={(e) => setName(e.target.value)}
        />

        <label>Phone Number:</label>
        <input
          type="text"
          value={phone}
          placeholder="Enter your phone number"
          onChange={(e) => setPhone(e.target.value)}
        />

        <label>Address:</label>
        <textarea
          rows="4"
          cols="50"
          value={address}
          placeholder="Enter your address"
          onChange={(e) => setAddress(e.target.value)}
        />

        <button className="savebutton" onClick={handleSaveProfile}>
          Save Profile
        </button>

        {profileSaved && (
          <div className="profile-view">
            <h3>Saved Profile:</h3>
            <p><strong>Name:</strong> {name}</p>
            <p><strong>Phone:</strong> {phone}</p>
            <p><strong>Address:</strong> {address}</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default Profile;
