// src/App.jsx
import { useState, useEffect } from "react";

import Header from "./components/Header/Header";
import Hero from "./components/Body/Hero";
import HowItWorks from "./components/Body/HowItWorks";
import Features from "./components/Body/Features";
import ImpactStrip from "./components/Body/ImpactStrip";
import About from "./components/Body/About";
import Contact from "./components/Body/Contact";
import Footer from "./components/Footer/Footer";
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";
import Dashboard from "./components/Dashboard/Dashboard";
import PrivacyPolicy from "./components/Dashboard/pages/PrivacyPolicy";
import TermsOfService from "./components/Dashboard/pages/TermsOfService";
import { colors, fonts } from "./theme";
import { isLoggedIn } from "./utils/auth";

const getPageFromPath = () => {
  const pathname = window.location.pathname.replace(/\/+$/, "");
  if (pathname === "/login") return isLoggedIn() ? "dashboard" : "login";
  if (pathname === "/signup") return isLoggedIn() ? "dashboard" : "signup";
  if (pathname === "/privacy-policy") return "privacy";
  if (pathname === "/terms-of-service") return "terms";
  if (pathname === "/dashboard") return isLoggedIn() ? "dashboard" : "login";
  return isLoggedIn() ? "dashboard" : "home";
};

const getPathFromPage = (page) => {
  if (page === "login") return "/login";
  if (page === "signup") return "/signup";
  if (page === "privacy") return "/privacy-policy";
  if (page === "terms") return "/terms-of-service";
  if (page === "dashboard") return "/dashboard";
  return "/";
};

export default function App() {
  const [page, setPage] = useState(() => getPageFromPath());

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    document.body.style.fontFamily = fonts.body;
    document.body.style.backgroundColor = colors.white;
    document.body.style.color = colors.charcoal;
    document.body.style.fontSize = "16px";
    document.body.style.lineHeight = "1.65";
    document.body.style.webkitFontSmoothing = "antialiased";
  }, []);

  useEffect(() => {
    const handlePopState = () => setPage(getPageFromPath());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Scroll to top whenever the page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  const navigate = (nextPage) => {
    const normalizedPage =
      nextPage === "dashboard" && !isLoggedIn() ? "login" : nextPage;
    const nextPath = getPathFromPage(normalizedPage);

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }

    setPage(normalizedPage);
  };

  if (page === "login") return <Login onNavigate={navigate} />;
  if (page === "signup") return <Signup onNavigate={navigate} />;
  if (page === "dashboard") return <Dashboard onNavigate={navigate} />;
  if (page === "privacy") return <PrivacyPolicy onNavigate={navigate} />;
  if (page === "terms") return <TermsOfService onNavigate={navigate} />;

  return (
    <>
      <Header onNavigate={navigate} />

      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <ImpactStrip />
        <About onNavigate={navigate} />
        <Contact />
      </main>

      <Footer onNavigate={navigate} />
    </>
  );
}
