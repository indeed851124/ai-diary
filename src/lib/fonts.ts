import { Fraunces, Hahmlet, Nanum_Pen_Script } from "next/font/google";

// 한글 글리프는 Google이 unicode-range로 잘게 나눠 필요한 조각만 받는다.
// 한글 폰트는 preload하면 첫 화면이 무거워지므로 swap으로 늦게 불러온다.
export const display = Hahmlet({
  variable: "--font-hahmlet",
  weight: "variable",
  display: "swap",
  preload: false,
  fallback: ["Batang", "serif"],
});

export const numeral = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

export const hand = Nanum_Pen_Script({
  variable: "--font-nanum-pen",
  weight: "400",
  display: "swap",
  preload: false,
  fallback: ["cursive"],
});

export const fontVariables = [display.variable, numeral.variable, hand.variable].join(" ");
