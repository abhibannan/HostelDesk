import { useState, useEffect } from "react";
import "./JoinPage.css";

const API_URL = import.meta.env.VITE_API_URL || "https://staynexa-api.onrender.com/api/v1";

export default function JoinPage() {
  const [hostelId, setHostelId] = useState("");
  const [room, setRoom] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    address: ""
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hId = params.get("hostelId");
    const rNum = params.get("room");
    
    if (hId) setHostelId(hId);
    if (rNum) setRoom(rNum);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => {
    if (step === 1 && (!formData.name || !formData.email || !formData.phone || !formData.password)) {
      setError("Please fill out all personal details before continuing.");
      return;
    }
    setError("");
    setStep(2);
  };

  const prevStep = () => setStep(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostelId) {
      setError("Invalid invite link. Missing hostel ID.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(`${API_URL}/renters/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, hostelId, room })
      });
      
      if (!response.ok) {
        throw new Error("Failed to submit registration");
      }
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="join-container">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="glass-card success-card">
          <div className="success-icon-wrapper">
            <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
              <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
              <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
          </div>
          <h1>Request Sent Successfully!</h1>
          <p>Your details have been submitted to the management.</p>
          <div className="room-badge">
             <span>Hostel: {hostelId}</span>
             {room && <span> • Room {room}</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="join-container">
      {/* Animated background blobs */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>

      <div className="glass-card">
        <div className="card-header">
          <div className="logo-placeholder">
            <span className="logo-icon">S</span>
            <h2>StayNexa</h2>
          </div>
          <h1>Resident Onboarding</h1>
          <p>Complete your profile to join {room ? `Room ${room}` : 'your new home'}.</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="modern-form">
          {/* Step indicator */}
          <div className="progress-bar">
            <div className={`progress-step ${step >= 1 ? 'active' : ''}`}></div>
            <div className={`progress-step ${step >= 2 ? 'active' : ''}`}></div>
          </div>

          <div className={`form-step ${step === 1 ? 'active' : 'hidden'}`}>
            <h3>Personal Information</h3>
            <div className="input-group">
              <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder=" " />
              <label>Full Name</label>
            </div>
            
            <div className="input-group">
              <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder=" " />
              <label>Email Address</label>
            </div>
            
            <div className="input-group">
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder=" " />
              <label>Phone Number</label>
            </div>
            
            <div className="input-group">
              <input type="password" name="password" value={formData.password} onChange={handleChange} required placeholder=" " />
              <label>Create Password</label>
            </div>
            
            <button type="button" className="btn-glow" onClick={nextStep}>
              Continue <span>&rarr;</span>
            </button>
          </div>

          <div className={`form-step ${step === 2 ? 'active' : 'hidden'}`}>
            <h3>Emergency & Address</h3>
            <div className="input-group">
              <input type="text" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} required placeholder=" " />
              <label>Emergency Contact Name</label>
            </div>
            
            <div className="input-group">
              <input type="tel" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} required placeholder=" " />
              <label>Emergency Contact Phone</label>
            </div>
            
            <div className="input-group">
              <textarea name="address" value={formData.address} onChange={handleChange} required placeholder=" " rows={3}></textarea>
              <label>Permanent Address</label>
            </div>
            
            <div className="button-group">
              <button type="button" className="btn-secondary" onClick={prevStep}>
                Back
              </button>
              <button type="submit" className="btn-glow submit-btn" disabled={loading}>
                {loading ? <span className="loader"></span> : "Submit Application"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
