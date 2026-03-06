
import { Body, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import * as React from "react";

interface AccountReinstatedEmailProps {
  userName?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const AccountReinstatedEmail = ({ userName }: AccountReinstatedEmailProps) => (
  <Html>
    <Head />
    <Preview>Your Account Has Been Reinstated</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={`${baseUrl}/icon.png`} width="48" height="48" alt="Platform Icon" />
        <Heading style={heading}>Account Reinstatement Notice</Heading>
        <Section>
          <Text style={text}>Hello {userName || "User"},</Text>
          <Text style={text}>
            We are writing to inform you that your account on our platform has been reinstated. 
            You can now log in and access our services again.
          </Text>
          <Text style={text}>
            Please ensure you adhere to our terms of service to avoid future suspensions. 
            If you have any questions, please contact our support team.
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

export default AccountReinstatedEmail;

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

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const footer = {
  color: "#9ca299",
  fontSize: "14px",
  lineHeight: "24px",
};
