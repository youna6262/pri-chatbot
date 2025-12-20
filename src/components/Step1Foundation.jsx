import React from "react";
import FractalIntro from "./FractalIntro";
import NatureFractals from "./NatureFractals";
import "./Step1Foundation.css";

export default function Step1Foundation() {
  return (
    <div className="step1-foundation">
      <div className="step1-intro">
        <FractalIntro />
      </div>
      <div className="step1-nature">
        <NatureFractals />
      </div>
    </div>
  );
}







