import "./globals.css";

export const metadata = {
  title: "QIE MerchantPay",
  description: "Mobile-first QIE crypto point-of-sale app for merchants.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
