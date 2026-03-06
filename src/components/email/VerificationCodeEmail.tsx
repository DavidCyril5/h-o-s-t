
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

interface VerificationCodeEmailProps {
  userName: string;
  verificationCode: string;
}

export const VerificationCodeEmail = ({
  userName,
  verificationCode,
}: VerificationCodeEmailProps) => (
  <Html>
    <Head />
    <Preview>Your Verification Code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Hello {userName},</Heading>
        <Text style={paragraph}>
          Your verification code is:
        </Text>
        <Text style={codeStyle}>{verificationCode}</Text>
        <Text style={paragraph}>
          This code will expire in 10 minutes.
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "bold",
  marginBottom: "20px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
};

const codeStyle = {
  fontSize: "28px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "20px 0",
  letterSpacing: "10px"
};
