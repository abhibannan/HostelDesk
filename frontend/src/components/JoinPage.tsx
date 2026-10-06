import { useState, useEffect } from "react";
import "./JoinPage.css";

const API_URL = import.meta.env.VITE_API_URL || "https://staynexa-api.onrender.com/api/v1";

export default function JoinPage() {
  const [hostelId, setHostelId] = useState("");
  const [room, setRoom] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    address: ""
  });
  
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hId = params.get("hostelId") || "";
    const rNum = params.get("room") || "";
    setHostelId(hId);
    setRoom(rNum);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      // Assuming a public endpoint for onboarding, if it doesn't exist we'll need to create it
      const response = await fetch(`${API_URL}/renters/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, hostelId, room }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to submit registration");
      
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "An unknown error occurred.");
    }
  };

  if (status === "success") {
    return (
      <div className="join-container">
        <div className="glass-card success-card">
          <div className="success-icon">✓</div>
          <h1>Registration Complete!</h1>
          <p>Welcome to your new home. Your details have been successfully submitted to the hostel management.</p>
          <p className="subtext">You can now safely close this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="join-container">
      <div className="glass-card form-card">
        <div className="form-header">
          <h1>Join StayNexa</h1>
          <p>Complete your resident profile</p>
          {(room || hostelId) && (
            <div className="badge-container">
              {room && <span className="glass-badge">Room: {room}</span>}
            </div>
          )}
        </div>

        {status === "error" && <div className="error-alert">{errorMessage}</div>}

        <form onSubmit={handleSubmit} className="join-form">
          <div className="input-group">
            <label htmlFor="name">Full Name</label>
            <input type="text" id="name" name="name" required value={formData.name} onChange={handleChange} placeholder="John Doe" />
          </div>

          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input type="email" id="email" name="email" required value={formData.email} onChange={handleChange} placeholder="john@example.com" />
          </div>

          <div className="input-group">
            <label htmlFor="phone">Phone Number</label>
            <input type="tel" id="phone" name="phone" required value={formData.phone} onChange={handleChange} placeholder="+1 234 567 8900" />
          </div>

          <div className="form-divider"><span>Emergency Contact</span></div>

          <div className="input-group">
            <label htmlFor="emergencyContactName">Contact Name</label>
            <input type="text" id="emergencyContactName" name="emergencyContactName" required value={formData.emergencyContactName} onChange={handleChange} placeholder="Jane Doe" />
          </div>

          <div className="input-group">
            <label htmlFor="emergencyContactPhone">Contact Phone</label>
            <input type="tel" id="emergencyContactPhone" name="emergencyContactPhone" required value={formData.emergencyContactPhone} onChange={handleChange} placeholder="+1 098 765 4321" />
          </div>
          
          <div className="input-group">
            <label htmlFor="address">Permanent Address</label>
            <textarea id="address" name="address" required value={formData.address} onChange={handleChange} placeholder="123 Main St, City, Country" rows={3} />
          </div>

          <button type="submit" className="submit-btn" disabled={status === "submitting"}>
            {status === "submitting" ? <span className="spinner"></span> : "Complete Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}
