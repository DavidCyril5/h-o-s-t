
import { Body, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import * as React from "react";

interface AccountSuspendedEmailProps {
  userName?: string;
  reason?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const AccountSuspendedEmail = ({ userName, reason }: AccountSuspendedEmailProps) => (
  <Html>
    <Head />
    <Preview>Your Account Has Been Suspended</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={`${baseUrl}/icon.png`} width="48" height="48" alt="Platform Icon" />
        <Heading style={heading}>Account Suspension Notice</Heading>
        <Section>
          <Text style={text}>Hello {userName || "User"},</Text>
          <Text style={text}>
            We are writing to inform you that your account on our platform has been suspended. 
            This action was taken due to a violation of our terms of service.
          </Text>
          {reason && (
            <>
              <Text style={text}>Reason provided for suspension:</Text>
              <Text style={reasonText}>{reason}</Text>
            </>
          )}
          <Text style={text}>
            This means you will no longer be able to access your account or use our services. 
            If you believe this was a mistake, you may try to contact our support team, but please be aware that decisions on serious violations are typically final.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            This email was intended for {userName || "a user of our platform"}. If you were not expecting this email, you can ignore it.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default AccountSuspendedEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: "-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Oxygen-Sans,Ubuntu,Cantarell,\"Helvetica Neue\",sans-serif",
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  width: "580px",
};

const heading = {
  fontSize: "32px",
  fontWeight: "bold",
  textAlign: "center" as const,
};

const text = {
  fontSize: "16px",
  color: "#333",
};

const reasonText = {
  fontSize: "16px",
  color: "#555",
  backgroundColor: "#f0f0f0",
  padding: "10px",
  borderRadius: "4px",
  borderLeft: "3px solid #d9534f",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const footer = {
  color: "#9ca299",
  fontSize: "14px",
  lineHeight: "24px",
};
