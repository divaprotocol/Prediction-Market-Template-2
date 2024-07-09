import Link from "next/link";
import Image from "next/image";
import React from "react";
const FooterLinks = [
  {
    name: "About",
    link: "https://shortx.io/",
  },
  {
    name: "Docs",
    link: "https://docs.shortx.io/",
  },
  {
    name: "ShotX",
    link: "",
  },
  {
    name: "App",
    link: "https://app.shortx.io/",
  },
  {
    name: "Blog",
    link: "https://shortx.substack.com/",
  },
];
const socialLinks = [
 
 
  {
    name: "twitter",
    img: "/images/twitter.png",
    url: "www.twitter.com/shortx",
  },
];
export const Footer = () => {
  return (
    <footer className="bg-black flex flex-col items-center px-10 pt-18 pb-6 md:px-56 py-14 gap-16">
      <div className="flex flex-col gap-10 md:gap-20 w-full md:flex-row">
        {/* {FooterLinks.map((item) => ( */}
        <div className="flex flex-col gap-3 w-[260px]">
          <Link href={"/"} className="font-semibold">
            About
          </Link>
          <Link href={"/"} className="font-semibold">
            Docs
          </Link>
        </div>
        <div className="flex flex-col gap-3 w-[260px]">
          <Link href={"/"} className="font-semibold">
            ShortX
          </Link>
          <Link href={"/"} className="font-semibold text-[#FFFFFFCC]">
            APP
          </Link>
        </div>
        <div className="flex flex-col gap-3 w-[260px]">
          <Link href={"/"} className="font-semibold">
            Resources
          </Link>
          <Link href={"/"} className="font-semibold text-[#FFFFFFCC]">
            Community
          </Link>
          <Link href={"/"} className="font-semibold text-[#FFFFFFCC]">
            Contact
          </Link>
        </div>
      </div>
      <div className="flex items-center justify-between w-full mt-10">
        <h2 className="text-[#666666] text-sm w-full">
          © {new Date().getFullYear()} ShortX
        </h2>
        <Image
          className="w-5"
          alt="X"
          src="data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20d%3D%22M%200%200%20L%2020%200%20L%2020%2020%20L%200%2020%20Z%22%20fill%3D%22transparent%22%3E%3C%2Fpath%3E%3Cpath%20d%3D%22M%2019.195%206.07%20L%2016.836%208.422%20C%2016.367%2013.883%2011.758%2018.125%206.25%2018.125%20C%205.117%2018.125%204.18%2017.945%203.469%2017.594%20C%202.898%2017.305%202.664%2017%202.602%2016.906%20C%202.497%2016.747%202.47%2016.549%202.53%2016.368%20C%202.589%2016.187%202.728%2016.043%202.906%2015.977%20C%202.922%2015.969%204.766%2015.266%205.961%2013.914%20C%205.22%2013.386%204.568%2012.743%204.031%2012.008%20C%202.961%2010.555%201.828%208.031%202.508%204.266%20C%202.551%204.038%202.716%203.852%202.938%203.781%20C%203.16%203.709%203.404%203.766%203.57%203.93%20C%203.594%203.961%206.195%206.523%209.375%207.352%20L%209.375%206.875%20C%209.381%205.874%209.785%204.917%2010.497%204.214%20C%2011.209%203.51%2012.171%203.119%2013.172%203.125%20C%2014.495%203.144%2015.711%203.856%2016.375%205%20L%2018.75%205%20C%2019.002%204.999%2019.23%205.15%2019.328%205.383%20C%2019.42%205.618%2019.368%205.886%2019.195%206.07%20Z%22%20fill%3D%22%23222%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E"
          width={40}
          height={40}
        />
      </div>
    </footer>
  );
};
