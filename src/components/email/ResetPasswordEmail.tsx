
import * as React from 'react';

interface ResetPasswordEmailProps {
  userName: string;
  resetLink: string;
}

export const ResetPasswordEmail: React.FC<Readonly<ResetPasswordEmailProps>> = ({ userName, resetLink }) => (
  <div style={container}>
    <h1 style={heading}>Password Reset Request</h1>
    <p style={paragraph}>Hello {userName},</p>
    <p style={paragraph}>We received a request to reset the password for your Anita Deploy account. If you did not make this request, you can safely ignore this email.</p>
    <p style={paragraph}>To reset your password, please click the button below:</p>
    <a href={resetLink} target="_blank" rel="noopener noreferrer" style={button}>Reset Your Password</a>
    <p style={paragraph}>This password reset link is valid for the next 60 minutes.</p>
    <p style={paragraph}>If you're having trouble clicking the password reset button, copy and paste the URL below into your web browser:</p>
    <p style={linkText}>{resetLink}</p>
    <hr style={hr} />
    <p style={footer}>Thank you,<br />The Anita Deploy Team</p>
  </div>
);

// Basic inline styles for email client compatibility
const container: React.CSSProperties = {
  fontFamily: 'Arial, sans-serif',
  lineHeight: '1.6',
  color: '#333',
  maxWidth: '600px',
  margin: '0 auto',
  padding: '20px',
  border: '1px solid #ddd',
  borderRadius: '5px',
};

const heading: React.CSSProperties = {
  fontSize: '24px',
  color: '#220055',
};

const paragraph: React.CSSProperties = {
  fontSize: '16px',
  marginBottom: '10px',
};

const button: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#220055',
  color: '#ffffff',
  padding: '12px 25px',
  textDecoration: 'none',
  borderRadius: '5px',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '20px 0',
};

const linkText: React.CSSProperties = {
  wordBreak: 'break-all',
  fontSize: '12px',
  color: '#555',
};

const hr: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #ddd',
  margin: '20px 0',
};

const footer: React.CSSProperties = {
  fontSize: '14px',
  color: '#777',
};
