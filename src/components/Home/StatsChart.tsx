import { ApiData } from "@/types/data-api-types";
import Image from "next/image";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export const StatsChart = ({ apiData }: { apiData: ApiData | null }) => {
  const options2: any = {
    series: [
      {
        name: "Value",
        data: [80, 86, 100, 200, 150, 194, 266, 428, 587],
      },
    ],
    options: {
      chart: {
        height: 350,
        type: "area",
        toolbar: {
          show: false,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: "smooth",
      },
      yaxis: {
        min: 0,
        labels: {
          formatter: function (value: number) {
            return `$${value}`;
          },
        },
      },
      xaxis: {
        type: "year",
        categories: [1990, 1995, 2000, 2005, 2010, 2015, 2020, 2023, 2024],
      },
      tooltip: {
        x: {
          format: "yy",
        },
      },
    },
  };
  return (
    <div className="w-full flex gap-2 p-4 lg:w-[840px] rounded-2xl border-[1px] border-solid border-gray-200 bg-white">
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">
          Historical sqm price of Miami Real Estate
        </h2>
        <div className="flex flex-col gap-4 lg:gap-20 lg:flex-row">
          <div>
            <h2 className="text-3xl font-bold">$587.40</h2>
            <span className="text-sm text-gray-500">Current value</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col gap-4  ext-right">
              <div className="flex items-center justify-between">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                 d="M10 6.6665L15 11.6665H5L10 6.6665Z" fill="#38A169" 
                  />
                </svg>
                <span className="text-xs text-green-500">+2.61%</span>
              </div>
              <span className="text-gray-500 text-sm">3 months</span>
            </div>
            <div className="flex flex-col gap-4 text-right">
              <div className="flex items-center justify-between">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                   d="M10 6.6665L15 11.6665H5L10 6.6665Z" fill="#38A169" 
                  />
                </svg>
                <span className="text-xs text-green-500">+4.2%</span>
              </div>
              <span className="text-gray-500 text-sm">6 months</span>
            </div>
            <div className="flex flex-col gap-4 text-right">
              <div className="flex items-center justify-between">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path d="M10 6.6665L15 11.6665H5L10 6.6665Z" fill="#38A169" />
                </svg>
                <span className="text-xs text-green-500">+46.5%</span>
              </div>
              <span className="text-gray-500 text-sm">1 year</span>
            </div>
            <div className="flex flex-col gap-4 text-right">
              <div className="flex items-center justify-between">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path d="M10 6.6665L15 11.6665H5L10 6.6665Z" fill="#38A169" />
                </svg>
                <span className="text-xs text-green-500">+143.75%</span>
              </div>
              <span className="text-gray-500 text-sm">5 years</span>
            </div>
          </div>
        </div>
        <div className="w-[348px] md:w-[560px]">
          <Chart
            options={options2.options}
            series={options2.series}
            type="area"
            height={350}
          />
        </div>
        <div className="mt-4">
          <p style={{ fontSize: '0.475rem' }}>
            Data source: <a href="https://fred.stlouisfed.org/series/MIXRNSA" target="_blank" rel="noopener noreferrer">S&P CoreLogic Case-Shiller FL-Miami Home Price Index</a>
          </p>
          <p style={{ fontSize: '0.475rem' }}>
            Parcl: <a href="https://app.parcl.co/parcls/5353022" target="_blank" rel="noopener noreferrer">Parcl Miami Beach</a>
          </p>
        </div>
      </div>
      <hr className="hidden lg:flex w-[1px] h-auto bg-[#CBD5E0]" />
 <div className="hidden lg:flex flex-col gap-4 justify-center">
        <p>
          Market will resolve to <strong className="text-red-500">NO</strong> if
          price on Dec 31, 2050 is{" "}
          <strong className="text-red-500">above $100.00</strong>
        </p>
        <span className="flex flex-col gap-1">
          <Image src="/images/UpArrow.png" alt="arrow" width={40} height={40} className="w-4" />
          <Image src="/images/DownArrow.png" alt="arrow" width={40} height={40} className="w-4" />
        </span>
        <p>
          Market will resolve to <strong className="text-green-500">YES</strong>{" "}
          if price on Dec 31, 2050 is at or{" "}
          <strong className="text-green-500">below $100.00</strong>
        </p>
      </div>
    </div>
  );
};
